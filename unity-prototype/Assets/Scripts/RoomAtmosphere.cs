using UnityEngine;

namespace Lorgus.Prototype
{
    /// <summary>
    /// Restrained candlelight and dust only. No generated music or ambient audio:
    /// the project's music and sound direction belongs to the user.
    /// </summary>
    public sealed class RoomAtmosphere : MonoBehaviour
    {
        private Light roomLight;
        private Light candleLight;
        private float baseIntensity;
        private float candleBaseIntensity;
        private float phase;
        private ParticleSystem dust;

        private void Awake()
        {
            var roomLightObject = GameObject.Find("Warm room light");
            roomLight = roomLightObject != null ? roomLightObject.GetComponent<Light>() : null;
            var candleLightObject = GameObject.Find("Candle glow");
            candleLight = candleLightObject != null ? candleLightObject.GetComponent<Light>() : null;
            if (roomLight != null) baseIntensity = roomLight.intensity;
            if (candleLight != null) candleBaseIntensity = candleLight.intensity;
            BuildDust();
        }

        private void Update()
        {
            phase += Time.deltaTime;
            if (roomLight != null)
            {
                float slow = Mathf.Sin(phase * 1.7f) * 0.035f;
                float quick = Mathf.Sin(phase * 4.9f + 0.8f) * 0.012f;
                roomLight.intensity = baseIntensity * (1f + slow + quick);
            }
            if (candleLight != null)
            {
                float flame = Mathf.Sin(phase * 5.3f + 0.4f) * 0.075f
                            + Mathf.Sin(phase * 8.1f + 1.7f) * 0.025f;
                candleLight.intensity = candleBaseIntensity * (1f + flame);
            }
        }

        private void BuildDust()
        {
            var go = new GameObject("Dust in candlelight");
            go.transform.position = new Vector3(0f, 1.35f, 0.4f);
            dust = go.AddComponent<ParticleSystem>();
            var main = dust.main;
            main.duration = 8f;
            main.loop = true;
            main.startLifetime = new ParticleSystem.MinMaxCurve(4f, 8f);
            main.startSpeed = new ParticleSystem.MinMaxCurve(0.015f, 0.06f);
            main.startSize = new ParticleSystem.MinMaxCurve(0.008f, 0.022f);
            main.startColor = new Color(0.78f, 0.62f, 0.39f, 0.28f);
            main.maxParticles = 36;
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            main.gravityModifier = 0f;
            var emission = dust.emission;
            emission.rateOverTime = 4f;
            var shape = dust.shape;
            shape.shapeType = ParticleSystemShapeType.Box;
            shape.scale = new Vector3(5.4f, 2.1f, 5.4f);
            var velocity = dust.velocityOverLifetime;
            velocity.enabled = true;
            velocity.x = new ParticleSystem.MinMaxCurve(-0.025f, 0.025f);
            velocity.y = new ParticleSystem.MinMaxCurve(-0.008f, 0.018f);
            velocity.z = new ParticleSystem.MinMaxCurve(-0.018f, 0.018f);
            var renderer = dust.GetComponent<ParticleSystemRenderer>();
            renderer.renderMode = ParticleSystemRenderMode.Billboard;
            Shader particleShader = Shader.Find("Particles/Standard Unlit");
            if (particleShader == null) particleShader = Shader.Find("Sprites/Default");
            if (particleShader != null)
            {
                var particleMaterial = new Material(particleShader);
                particleMaterial.color = new Color(0.82f, 0.68f, 0.46f, 0.32f);
                renderer.material = particleMaterial;
            }
            dust.Play();
        }
    }
}