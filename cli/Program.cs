using System;
using System.IO;
using System.Net;
using System.Reflection;
using System.Diagnostics;
using System.Threading;

namespace ContourSampler
{
    class Program
    {
        private static HttpListener listener;
        private static string exeDir;
        private static Assembly currentAssembly;

        static void Main(string[] args)
        {
            currentAssembly = Assembly.GetExecutingAssembly();
            exeDir = AppDomain.CurrentDomain.BaseDirectory;

            // CLI Routing
            if (args.Length > 0 && args[0] != "--gui")
            {
                string cmd = args[0].ToLowerInvariant();
                if (cmd == "--help" || cmd == "-h" || cmd == "help")
                {
                    PrintHelp();
                    return;
                }

                if (cmd == "sample" || cmd == "decode" || cmd == "test")
                {
                    RunCliCommand(cmd, args);
                    return;
                }
            }

            // GUI / Web Workstation Mode
            StartWorkstation();
        }

        static void PrintHelp()
        {
            Console.WriteLine("========================================================================");
            Console.WriteLine("  Contour Sampler — Topological Boundary Vectorizer");
            Console.WriteLine("========================================================================");
            Console.WriteLine("Usage:");
            Console.WriteLine("  Contour-Sampler.exe                  Launch interactive Pro Workstation UI");
            Console.WriteLine("  Contour-Sampler.exe sample [opts]    Run CLI boundary sampling on video");
            Console.WriteLine("  Contour-Sampler.exe decode [opts]    Decode contours to video/outline/svg");
            Console.WriteLine("  Contour-Sampler.exe test             Run algorithmic self-tests");
            Console.WriteLine();
            Console.WriteLine("Examples:");
            Console.WriteLine("  Contour-Sampler.exe sample input.mp4 -o out.bacs");
            Console.WriteLine("  Contour-Sampler.exe decode out.bacs -o lines.mp4 --mode outline");
            Console.WriteLine("========================================================================");
        }

        static void RunCliCommand(string cmd, string[] args)
        {
            string scriptName = cmd == "sample" ? "cli/sample.js" : (cmd == "decode" ? "cli/decode.js" : "test/selftest.js");
            string scriptPath = Path.Combine(exeDir, scriptName.Replace('/', Path.DirectorySeparatorChar));

            if (!File.Exists(scriptPath))
            {
                // Fallback to searching nearby
                string alt = Path.Combine(exeDir, "..", scriptName.Replace('/', Path.DirectorySeparatorChar));
                if (File.Exists(alt)) scriptPath = alt;
            }

            // Build arguments
            string remainingArgs = "";
            for (int i = 1; i < args.Length; i++)
            {
                remainingArgs += " \"" + args[i] + "\"";
            }

            try
            {
                ProcessStartInfo psi = new ProcessStartInfo("node", "\"" + scriptPath + "\"" + remainingArgs);
                psi.UseShellExecute = false;
                Process p = Process.Start(psi);
                p.WaitForExit();
                Environment.Exit(p.ExitCode);
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("[Error] Failed to execute CLI command: " + ex.Message);
                Console.WriteLine("Ensure Node.js 18+ is installed in PATH to run headless CLI.");
                Console.ResetColor();
            }
        }

        static void StartWorkstation()
        {
            int port = 8080;
            while (port < 8100)
            {
                try
                {
                    listener = new HttpListener();
                    listener.Prefixes.Add("http://127.0.0.1:" + port + "/");
                    listener.Prefixes.Add("http://localhost:" + port + "/");
                    listener.Start();
                    break;
                }
                catch
                {
                    listener.Close();
                    port++;
                }
            }

            string url = "http://127.0.0.1:" + port + "/";
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("========================================================================");
            Console.WriteLine("  Contour Sampler — Topological Boundary Vectorizer Workstation");
            Console.WriteLine("========================================================================");
            Console.ResetColor();
            Console.WriteLine("  Local Server: " + url);
            Console.WriteLine("  Interactive UI launched in default browser.");
            Console.WriteLine("  Press Ctrl+C or close this console window to exit.");
            Console.WriteLine("========================================================================");

            // Open default web browser
            try
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
            catch
            {
                try { Process.Start("cmd.exe", "/c start " + url); } catch { }
            }

            // Listen loop
            while (listener.IsListening)
            {
                try
                {
                    var ctx = listener.GetContext();
                    ThreadPool.QueueUserWorkItem((_) => ProcessRequest(ctx));
                }
                catch
                {
                    break;
                }
            }
        }

        static void ProcessRequest(HttpListenerContext ctx)
        {
            try
            {
                string rawPath = ctx.Request.Url.AbsolutePath.TrimStart('/');
                if (string.IsNullOrEmpty(rawPath) || rawPath == "/") rawPath = "index.html";

                // Security check
                if (rawPath.Contains(".."))
                {
                    ctx.Response.StatusCode = 403;
                    ctx.Response.Close();
                    return;
                }

                byte[] data = null;
                string mime = GetMimeType(rawPath);

                // 1. Try reading from disk relative to executable
                string localFile = Path.Combine(exeDir, rawPath.Replace('/', Path.DirectorySeparatorChar));
                if (File.Exists(localFile))
                {
                    data = File.ReadAllBytes(localFile);
                }
                else
                {
                    // 2. Fallback to embedded resource
                    string resName = "ContourSampler." + rawPath.Replace('/', '.');
                    Stream resStream = currentAssembly.GetManifestResourceStream(resName);
                    if (resStream == null)
                    {
                        // Try case-insensitive matching
                        foreach (string name in currentAssembly.GetManifestResourceNames())
                        {
                            if (name.EndsWith(rawPath.Replace('/', '.'), StringComparison.OrdinalIgnoreCase))
                            {
                                resStream = currentAssembly.GetManifestResourceStream(name);
                                break;
                            }
                        }
                    }

                    if (resStream != null)
                    {
                        using (MemoryStream ms = new MemoryStream())
                        {
                            resStream.CopyTo(ms);
                            data = ms.ToArray();
                        }
                        resStream.Dispose();
                    }
                }

                if (data != null)
                {
                    ctx.Response.ContentType = mime;
                    ctx.Response.ContentLength64 = data.Length;
                    ctx.Response.StatusCode = 200;
                    ctx.Response.OutputStream.Write(data, 0, data.Length);
                }
                else
                {
                    ctx.Response.StatusCode = 404;
                    byte[] notFound = System.Text.Encoding.UTF8.GetBytes("404 Not Found: " + rawPath);
                    ctx.Response.OutputStream.Write(notFound, 0, notFound.Length);
                }
            }
            catch
            {
                ctx.Response.StatusCode = 500;
            }
            finally
            {
                try { ctx.Response.Close(); } catch { }
            }
        }

        static string GetMimeType(string path)
        {
            string ext = Path.GetExtension(path).ToLowerInvariant();
            switch (ext)
            {
                case ".html": return "text/html; charset=utf-8";
                case ".css": return "text/css; charset=utf-8";
                case ".js": return "application/javascript; charset=utf-8";
                case ".json": case ".ndjson": return "application/json";
                case ".svg": return "image/svg+xml";
                case ".png": return "image/png";
                case ".jpg": case ".jpeg": return "image/jpeg";
                case ".webp": return "image/webp";
                case ".mp4": return "video/mp4";
                case ".webm": return "video/webm";
                case ".bacs": return "application/octet-stream";
                default: return "application/octet-stream";
            }
        }
    }
}
