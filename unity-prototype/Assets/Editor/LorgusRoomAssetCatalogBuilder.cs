#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace Lorgus.Prototype.Editor
{
    /// <summary>
    /// Builds the Resources catalog from the FBX assets in source control.
    /// No downloads or duplicate model copies are needed.
    /// </summary>
    [InitializeOnLoad]
    public sealed class LorgusRoomAssetCatalogBuilder : IPreprocessBuildWithReport
    {
        private const string CatalogPath = "Assets/Resources/LorgusRoomAssetCatalog.asset";
        private const string ModelRoot = "Assets/Art/QuaterniusFantasyProps/Models/FBX/";

        static LorgusRoomAssetCatalogBuilder()
        {
            EditorApplication.delayCall += () => EnsureCatalog();
        }

        public int callbackOrder => -1000;

        public void OnPreprocessBuild(BuildReport report)
        {
            if (!EnsureCatalog())
                throw new BuildFailedException(
                    "LORGUS room asset catalog could not be generated. Check the Quaternius FBX files in Assets/Art.");
        }

        [MenuItem("LORGUS/Assets/Refresh room model catalog")]
        public static void RefreshFromMenu()
        {
            if (EnsureCatalog())
                Debug.Log("LORGUS: room model catalog refreshed from existing Quaternius FBX assets.");
            else
                Debug.LogWarning("LORGUS: one or more expected FBX models are missing; primitive fallbacks remain enabled.");
        }

        private static bool EnsureCatalog()
        {
            if (EditorApplication.isCompiling || EditorApplication.isUpdating) return false;

            string resourcesPath = "Assets/Resources";
            if (!AssetDatabase.IsValidFolder(resourcesPath))
            {
                if (!AssetDatabase.IsValidFolder("Assets"))
                    return false;
                AssetDatabase.CreateFolder("Assets", "Resources");
            }

            var catalog = AssetDatabase.LoadAssetAtPath<LorgusRoomAssetCatalog>(CatalogPath);
            if (catalog == null)
            {
                catalog = ScriptableObject.CreateInstance<LorgusRoomAssetCatalog>();
                AssetDatabase.CreateAsset(catalog, CatalogPath);
            }

            catalog.bed = Load("Bed_Twin1.fbx");
            catalog.nightstand = Load("Nightstand_Shelf.fbx");
            catalog.candle = Load("Candle_1.fbx");
            catalog.cabinet = Load("Cabinet.fbx");
            catalog.chest = Load("Chest_Wood.fbx");
            catalog.desk = Load("Table_Large.fbx");
            catalog.shelf = Load("Shelf_Arch.fbx");
            catalog.book = Load("Book_5.fbx");

            EditorUtility.SetDirty(catalog);
            AssetDatabase.SaveAssets();
            return catalog.bed != null && catalog.nightstand != null && catalog.chest != null
                && catalog.desk != null && catalog.book != null;
        }

        private static GameObject Load(string fileName)
        {
            string path = ModelRoot + fileName;
            var model = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            if (model == null)
                Debug.LogWarning("LORGUS: model asset not found at " + path);
            return model;
        }
    }
}
#endif
