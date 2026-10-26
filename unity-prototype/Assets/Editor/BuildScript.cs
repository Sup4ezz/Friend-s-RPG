using System;
using System.IO;
using System.Linq;
using System.Reflection;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;
using UnityEngine.Rendering;

namespace Lorgus.Prototype.Editor
{
    public static class BuildScript
    {
        private const string OutputDirectory = "Builds/Windows";
        private const string OutputPath = OutputDirectory + "/LORGUS.exe";
        private const string ScenePath = "Assets/Scenes/LorgusPrototype.unity";

        public static void BuildWindows()
        {
            // Use the native Windows graphics backend explicitly. This avoids inheriting
            // graphics API defaults from the Linux CI host used by earlier builds.
            PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.StandaloneWindows64, false);
            PlayerSettings.SetGraphicsAPIs(BuildTarget.StandaloneWindows64,
                new[] { GraphicsDeviceType.Direct3D11 });
            PlayerSettings.graphicsJobs = false;

            // The prototype uses UnityEngine.Input, not the new Input System.
            // Set legacy input mode reflectively to remain compatible across Unity 6 patch releases.
            try
            {
                PropertyInfo property = typeof(PlayerSettings).GetProperty(
                    "activeInputHandler", BindingFlags.Public | BindingFlags.Static);
                if (property != null && property.CanWrite && property.PropertyType.IsEnum)
                    property.SetValue(null, Enum.ToObject(property.PropertyType, 0));
            }
            catch (Exception exception)
            {
                Debug.LogWarning("Could not set legacy input mode automatically: " + exception.Message);
            }

            if (!File.Exists(ScenePath))
                throw new FileNotFoundException("Required LORGUS prototype scene is missing.", ScenePath);

            Directory.CreateDirectory(OutputDirectory);
            string[] scenes = EditorBuildSettings.scenes
                .Where(scene => scene.enabled && File.Exists(scene.path))
                .Select(scene => scene.path)
                .ToArray();
            if (scenes.Length == 0) scenes = new[] { ScenePath };

            var options = new BuildPlayerOptions
            {
                scenes = scenes,
                locationPathName = OutputPath,
                target = BuildTarget.StandaloneWindows64,
                options = BuildOptions.None
            };

            BuildReport report = BuildPipeline.BuildPlayer(options);
            if (report.summary.result != BuildResult.Succeeded)
                throw new Exception("LORGUS Windows build failed: " + report.summary.result
                    + ", errors=" + report.summary.totalErrors
                    + ", warnings=" + report.summary.totalWarnings);

            Debug.Log("LORGUS Windows build succeeded: " + Path.GetFullPath(OutputPath)
                + " (" + report.summary.totalSize + " bytes)");
        }
    }
}