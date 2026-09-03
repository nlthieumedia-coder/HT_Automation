using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using Microsoft.Win32;
using System.Windows.Forms;

[assembly: AssemblyTitle("HT Downloader Uninstaller")]
[assembly: AssemblyProduct("HT Downloader")]
[assembly: AssemblyCompany("HT Studio")]
[assembly: AssemblyVersion("2.0.2.0")]
[assembly: AssemblyFileVersion("2.0.2.0")]

internal static class Program
{
    private const string ProductName = "HT Downloader";

    [STAThread]
    private static void Main()
    {
        string uninstaller = FindRegisteredUninstaller() ?? FindDefaultUninstaller();
        if (string.IsNullOrWhiteSpace(uninstaller) || !File.Exists(uninstaller))
        {
            MessageBox.Show(
                "Không tìm thấy HT Downloader đã được cài đặt.",
                "HT Studio",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information);
            return;
        }

        Process.Start(new ProcessStartInfo
        {
            FileName = uninstaller,
            UseShellExecute = true
        });
    }

    private static string FindRegisteredUninstaller()
    {
        RegistryHive[] hives = { RegistryHive.CurrentUser, RegistryHive.LocalMachine };
        RegistryView[] views = { RegistryView.Registry64, RegistryView.Registry32 };

        foreach (RegistryHive hive in hives)
        foreach (RegistryView view in views)
        {
            try
            {
                using (RegistryKey baseKey = RegistryKey.OpenBaseKey(hive, view))
                using (RegistryKey uninstall = baseKey.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall"))
                {
                    if (uninstall == null) continue;
                    foreach (string subKeyName in uninstall.GetSubKeyNames())
                    using (RegistryKey app = uninstall.OpenSubKey(subKeyName))
                    {
                        string displayName = app == null ? null : app.GetValue("DisplayName") as string;
                        if (!string.Equals(displayName, ProductName, StringComparison.OrdinalIgnoreCase)) continue;
                        string command = app.GetValue("UninstallString") as string;
                        string executable = ExtractExecutable(command);
                        if (!string.IsNullOrWhiteSpace(executable)) return executable;
                    }
                }
            }
            catch (Exception) { }
        }

        return null;
    }

    private static string FindDefaultUninstaller()
    {
        return Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Programs",
            ProductName,
            "Uninstall " + ProductName + ".exe");
    }

    private static string ExtractExecutable(string command)
    {
        if (string.IsNullOrWhiteSpace(command)) return null;
        command = command.Trim();
        if (command.StartsWith("\"", StringComparison.Ordinal))
        {
            int closingQuote = command.IndexOf('"', 1);
            return closingQuote > 1 ? command.Substring(1, closingQuote - 1) : null;
        }

        int exeEnd = command.IndexOf(".exe", StringComparison.OrdinalIgnoreCase);
        return exeEnd >= 0 ? command.Substring(0, exeEnd + 4) : command;
    }
}
