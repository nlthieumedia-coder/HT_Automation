// ============================================================================
// ffmpeg-bridge — UXP Hybrid Plugin Addon cho Premiere Pro (Windows x64)
// ============================================================================

#include <windows.h>
#include <string>
#include <vector>
#include <sstream>
#include <cstdio>

#include "UxpAddon.h"

static void DebugLog(const std::string& msg) {
    char tempPath[MAX_PATH] = {0};
    if (GetTempPathA(MAX_PATH, tempPath) == 0) return;
    std::string logPath = std::string(tempPath) + "ht_automation_uxp_addon.log";
    FILE* f = fopen(logPath.c_str(), "a");
    if (f) {
        fprintf(f, "%s\n", msg.c_str());
        fclose(f);
    }
}

// ============================================================================
// PHẦN 1 — Win32: chạy tiến trình ngoài, bắt stdout/stderr/exitCode
// ============================================================================

struct ProcessResult {
    DWORD exitCode = 0;
    std::string stdOut;
    std::string stdErr;
    bool launchFailed = false;
    std::string launchError;
};

static std::string ReadAllFromPipe(HANDLE hPipe) {
    std::string result;
    char buffer[4096];
    DWORD bytesRead = 0;
    while (ReadFile(hPipe, buffer, sizeof(buffer), &bytesRead, nullptr) && bytesRead > 0) {
        result.append(buffer, bytesRead);
    }
    return result;
}

static std::wstring BuildCommandLine(const std::wstring& exePath, const std::vector<std::wstring>& args) {
    auto quoteIfNeeded = [](const std::wstring& s) -> std::wstring {
        if (s.find(L' ') == std::wstring::npos && !s.empty()) return s;
        std::wstring out = L"\"";
        for (wchar_t c : s) {
            if (c == L'"') out += L"\\\"";
            else out += c;
        }
        out += L"\"";
        return out;
    };

    std::wstring cmd = quoteIfNeeded(exePath);
    for (const auto& a : args) {
        cmd += L" ";
        cmd += quoteIfNeeded(a);
    }
    return cmd;
}

static std::wstring Utf8ToWide(const std::string& s) {
    if (s.empty()) return L"";
    int len = MultiByteToWideChar(CP_UTF8, 0, s.c_str(), (int)s.size(), nullptr, 0);
    std::wstring w(len, 0);
    MultiByteToWideChar(CP_UTF8, 0, s.c_str(), (int)s.size(), &w[0], len);
    return w;
}

ProcessResult RunProcessAndCapture(const std::string& exePathUtf8, const std::vector<std::string>& argsUtf8) {
    ProcessResult result;

    std::wstring exePath = Utf8ToWide(exePathUtf8);
    std::vector<std::wstring> args;
    for (const auto& a : argsUtf8) args.push_back(Utf8ToWide(a));

    std::wstring cmdLine = BuildCommandLine(exePath, args);

    SECURITY_ATTRIBUTES saAttr{};
    saAttr.nLength = sizeof(SECURITY_ATTRIBUTES);
    saAttr.bInheritHandle = TRUE;
    saAttr.lpSecurityDescriptor = nullptr;

    HANDLE hStdOutRead = nullptr, hStdOutWrite = nullptr;
    HANDLE hStdErrRead = nullptr, hStdErrWrite = nullptr;

    if (!CreatePipe(&hStdOutRead, &hStdOutWrite, &saAttr, 0) ||
        !SetHandleInformation(hStdOutRead, HANDLE_FLAG_INHERIT, 0)) {
        result.launchFailed = true;
        result.launchError = "Khong the tao pipe stdout";
        return result;
    }
    if (!CreatePipe(&hStdErrRead, &hStdErrWrite, &saAttr, 0) ||
        !SetHandleInformation(hStdErrRead, HANDLE_FLAG_INHERIT, 0)) {
        result.launchFailed = true;
        result.launchError = "Khong the tao pipe stderr";
        CloseHandle(hStdOutRead); CloseHandle(hStdOutWrite);
        return result;
    }

    STARTUPINFOW si{};
    si.cb = sizeof(STARTUPINFOW);
    si.dwFlags |= STARTF_USESTDHANDLES | STARTF_USESHOWWINDOW;
    si.wShowWindow = SW_HIDE;
    si.hStdOutput = hStdOutWrite;
    si.hStdError = hStdErrWrite;
    si.hStdInput = nullptr;

    PROCESS_INFORMATION pi{};

    std::vector<wchar_t> cmdLineBuf(cmdLine.begin(), cmdLine.end());
    cmdLineBuf.push_back(L'\0');

    BOOL ok = CreateProcessW(
        nullptr,
        cmdLineBuf.data(),
        nullptr, nullptr,
        TRUE,
        CREATE_NO_WINDOW,
        nullptr, nullptr,
        &si, &pi
    );

    CloseHandle(hStdOutWrite);
    CloseHandle(hStdErrWrite);

    if (!ok) {
        result.launchFailed = true;
        DWORD err = GetLastError();
        std::ostringstream oss;
        oss << "CreateProcess that bai, ma loi Win32: " << err;
        result.launchError = oss.str();
        CloseHandle(hStdOutRead);
        CloseHandle(hStdErrRead);
        return result;
    }

    std::string outCapture, errCapture;
    HANDLE hOutThread = CreateThread(nullptr, 0, [](LPVOID param) -> DWORD {
        auto* pair = reinterpret_cast<std::pair<HANDLE, std::string*>*>(param);
        *(pair->second) = ReadAllFromPipe(pair->first);
        delete pair;
        return 0;
    }, new std::pair<HANDLE, std::string*>(hStdOutRead, &outCapture), 0, nullptr);

    HANDLE hErrThread = CreateThread(nullptr, 0, [](LPVOID param) -> DWORD {
        auto* pair = reinterpret_cast<std::pair<HANDLE, std::string*>*>(param);
        *(pair->second) = ReadAllFromPipe(pair->first);
        delete pair;
        return 0;
    }, new std::pair<HANDLE, std::string*>(hStdErrRead, &errCapture), 0, nullptr);

    WaitForSingleObject(pi.hProcess, INFINITE);
    DWORD exitCode = 0;
    GetExitCodeProcess(pi.hProcess, &exitCode);

    WaitForSingleObject(hOutThread, INFINITE);
    WaitForSingleObject(hErrThread, INFINITE);

    CloseHandle(hOutThread);
    CloseHandle(hErrThread);
    CloseHandle(hStdOutRead);
    CloseHandle(hStdErrRead);
    CloseHandle(pi.hProcess);
    CloseHandle(pi.hThread);

    result.exitCode = exitCode;
    result.stdOut = outCapture;
    result.stdErr = errCapture;
    return result;
}

// ============================================================================
// PHẦN 2 — Lớp binding UXP Addon (Node-API / N-API binding)
// ============================================================================

static addon_value RunProcessBinding(addon_env env, addon_callback_info info) {
    size_t argc = 2;
    addon_value args[2] = { nullptr, nullptr };
    addon_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    std::string exePath = "ffmpeg";
    if (argc >= 1 && args[0]) {
        char buf[4096] = {0};
        size_t len = 0;
        if (addon_get_value_string_utf8(env, args[0], buf, sizeof(buf), &len) == addon_ok && len > 0) {
            exePath.assign(buf, len);
        }
    }

    std::vector<std::string> processArgs;
    if (argc >= 2 && args[1]) {
        uint32_t arrLen = 0;
        addon_get_array_length(env, args[1], &arrLen);
        for (uint32_t i = 0; i < arrLen; i++) {
            addon_value item = nullptr;
            addon_get_element(env, args[1], i, &item);
            if (!item) continue;
            char buf[4096] = {0};
            size_t len = 0;
            if (addon_get_value_string_utf8(env, item, buf, sizeof(buf), &len) == addon_ok && len > 0) {
                processArgs.push_back(std::string(buf, len));
            }
        }
    }

    ProcessResult pr = RunProcessAndCapture(exePath, processArgs);

    addon_value resultObj = nullptr;
    addon_create_object(env, &resultObj);

    addon_value exitCodeVal = nullptr;
    addon_create_int32(env, pr.launchFailed ? -1 : (int32_t)pr.exitCode, &exitCodeVal);
    addon_set_named_property(env, resultObj, "exitCode", exitCodeVal);

    addon_value stdoutVal = nullptr;
    addon_create_string_utf8(env, pr.stdOut.c_str(), pr.stdOut.size(), &stdoutVal);
    addon_set_named_property(env, resultObj, "stdout", stdoutVal);

    addon_value stderrVal = nullptr;
    std::string errText = pr.launchFailed ? pr.launchError : pr.stdErr;
    addon_create_string_utf8(env, errText.c_str(), errText.size(), &stderrVal);
    addon_set_named_property(env, resultObj, "stderr", stderrVal);

    return resultObj;
}

addon_value init(addon_env env, addon_value exports) {
    DebugLog("=== uxp_addon_init called ===");
    if (!exports) {
        DebugLog("exports is NULL, creating object...");
        addon_create_object(env, &exports);
    }
    addon_value fn = nullptr;
    addon_status st1 = addon_create_function(env, "runProcess", strlen("runProcess"), RunProcessBinding, nullptr, &fn);
    DebugLog("addon_create_function status: " + std::to_string((int)st1) + ", fn=" + std::to_string((uintptr_t)fn));
    
    if (fn) {
        addon_status st2 = addon_set_named_property(env, exports, "runProcess", fn);
        DebugLog("addon_set_named_property status: " + std::to_string((int)st2));
    } else {
        DebugLog("ERROR: fn is NULL after create_function!");
    }
    return exports;
}

void terminate() {
    DebugLog("=== uxp_addon_terminate called ===");
}

UXP_ADDON_INIT(init);
UXP_ADDON_TERMINATE(terminate);
