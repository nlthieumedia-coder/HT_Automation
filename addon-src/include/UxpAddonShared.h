#ifndef UXP_ADDON_SHARED_H
#define UXP_ADDON_SHARED_H

#include <windows.h>
#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
    addon_ok = 0,
    addon_invalid_arg,
    addon_object_expected,
    addon_string_expected,
    addon_name_expected,
    addon_function_expected,
    addon_number_expected,
    addon_boolean_expected,
    addon_array_expected,
    addon_generic_failure
} addon_status;

typedef struct napi_env__* addon_env;
typedef struct napi_value__* addon_value;
typedef struct napi_callback_info__* addon_callback_info;

typedef addon_value (*addon_callback)(addon_env env, addon_callback_info info);

#define NAPI_AUTO_LENGTH ((size_t)-1)

typedef int (*fn_napi_get_cb_info)(addon_env env, addon_callback_info cbinfo, size_t* argc, addon_value* argv, addon_value* this_arg, void** data);
typedef int (*fn_napi_get_value_string_utf8)(addon_env env, addon_value value, char* buf, size_t bufsize, size_t* result);
typedef int (*fn_napi_get_array_length)(addon_env env, addon_value value, uint32_t* result);
typedef int (*fn_napi_get_element)(addon_env env, addon_value object, uint32_t index, addon_value* result);
typedef int (*fn_napi_create_object)(addon_env env, addon_value* result);
typedef int (*fn_napi_create_int32)(addon_env env, int32_t value, addon_value* result);
typedef int (*fn_napi_create_string_utf8)(addon_env env, const char* str, size_t length, addon_value* result);
typedef int (*fn_napi_set_named_property)(addon_env env, addon_value object, const char* utf8name, addon_value value);
typedef int (*fn_napi_create_function)(addon_env env, const char* utf8name, size_t length, addon_callback cb, void* data, addon_value* result);

inline FARPROC GetNapiProc(const char* funcName) {
    const char* modules[] = {
        "dynamic-torqnative.dll",
        "libdynamic-napi.dll",
        "dvauxphost.dll",
        "dvauxpui.dll",
        "node.dll",
        NULL
    };
    for (int i = 0; modules[i] != NULL; i++) {
        HMODULE h = GetModuleHandleA(modules[i]);
        if (h) {
            FARPROC p = GetProcAddress(h, funcName);
            if (p) return p;
        }
    }
    return GetProcAddress(GetModuleHandleA(NULL), funcName);
}

inline addon_status addon_get_cb_info(addon_env env, addon_callback_info cbinfo, size_t* argc, addon_value* argv, addon_value* this_arg, void** data) {
    static fn_napi_get_cb_info pfn = nullptr;
    if (!pfn) pfn = (fn_napi_get_cb_info)GetNapiProc("napi_get_cb_info");
    if (!pfn) return addon_generic_failure;
    return (addon_status)pfn(env, cbinfo, argc, argv, this_arg, data);
}

inline addon_status addon_get_value_string_utf8(addon_env env, addon_value value, char* buf, size_t bufsize, size_t* result) {
    static fn_napi_get_value_string_utf8 pfn = nullptr;
    if (!pfn) pfn = (fn_napi_get_value_string_utf8)GetNapiProc("napi_get_value_string_utf8");
    if (!pfn) return addon_generic_failure;
    return (addon_status)pfn(env, value, buf, bufsize, result);
}

inline addon_status addon_get_array_length(addon_env env, addon_value value, uint32_t* result) {
    static fn_napi_get_array_length pfn = nullptr;
    if (!pfn) pfn = (fn_napi_get_array_length)GetNapiProc("napi_get_array_length");
    if (!pfn) return addon_generic_failure;
    return (addon_status)pfn(env, value, result);
}

inline addon_status addon_get_element(addon_env env, addon_value object, uint32_t index, addon_value* result) {
    static fn_napi_get_element pfn = nullptr;
    if (!pfn) pfn = (fn_napi_get_element)GetNapiProc("napi_get_element");
    if (!pfn) return addon_generic_failure;
    return (addon_status)pfn(env, object, index, result);
}

inline addon_status addon_create_object(addon_env env, addon_value* result) {
    static fn_napi_create_object pfn = nullptr;
    if (!pfn) pfn = (fn_napi_create_object)GetNapiProc("napi_create_object");
    if (!pfn) return addon_generic_failure;
    return (addon_status)pfn(env, result);
}

inline addon_status addon_create_int32(addon_env env, int32_t value, addon_value* result) {
    static fn_napi_create_int32 pfn = nullptr;
    if (!pfn) pfn = (fn_napi_create_int32)GetNapiProc("napi_create_int32");
    if (!pfn) return addon_generic_failure;
    return (addon_status)pfn(env, value, result);
}

inline addon_status addon_create_string_utf8(addon_env env, const char* str, size_t length, addon_value* result) {
    static fn_napi_create_string_utf8 pfn = nullptr;
    if (!pfn) pfn = (fn_napi_create_string_utf8)GetNapiProc("napi_create_string_utf8");
    if (!pfn) return addon_generic_failure;
    return (addon_status)pfn(env, str, length, result);
}

inline addon_status addon_set_named_property(addon_env env, addon_value object, const char* utf8name, addon_value value) {
    static fn_napi_set_named_property pfn = nullptr;
    if (!pfn) pfn = (fn_napi_set_named_property)GetNapiProc("napi_set_named_property");
    if (!pfn) return addon_generic_failure;
    return (addon_status)pfn(env, object, utf8name, value);
}

inline addon_status addon_create_function(addon_env env, const char* utf8name, size_t length, addon_callback cb, void* data, addon_value* result) {
    static fn_napi_create_function pfn = nullptr;
    if (!pfn) pfn = (fn_napi_create_function)GetNapiProc("napi_create_function");
    if (!pfn) return addon_generic_failure;
    return (addon_status)pfn(env, utf8name, length, cb, data, result);
}

#ifdef __cplusplus
}
#endif

#endif // UXP_ADDON_SHARED_H
