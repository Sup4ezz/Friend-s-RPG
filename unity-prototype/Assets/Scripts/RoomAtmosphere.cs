using UnityEngine;

namespace Lorgus.Prototype
{
    /// <summary>Low-cost ambient sound and subtle motion to make the single room feel inhabited.</summary>
    public sealed class RoomAtmosphere : MonoBehaviour
    {
        private Light roomLight;
        private float baseIntensity;
        private float phase;
        private ParticleSystem dust;

        private void Awake()
        {
            roomLight = FindObjectOfType<Light>();
            if (roomLight != null) baseIntensity = roomLight.intensity;
            BuildAmbientAudio();
            BuildDust();
        }

        private void Update()
        {
            phase += Time.deltaTime;
            if (roomLight != null)
            {
                // Gentle candle-like fluctuation; deliberately restrained, never a strobe.
                float slow = Mathf.Sin(phase * 1.7f) * 0.045f;
                float quick = Mathf.Sin(phase * 4.9f + 0.8f) * 0.018f;
                roomLight.intensity = baseIntensity * (1f + slow + quick);
            }
        }

        private void BuildAmbientAudio()
        {
            const int sampleRate = 22050;
            const int seconds = 12;
            int count = sampleRate * seconds;
            var samples = new float[count * 2];
            uint random = 0xA341316Cu;
            float low = 0f;
            float slower = 0f;

            for (int i = 0; i < count; i++)
            {
                random = 1664525u * random + 1013904223u;
                float noise = ((random >> 8) / 8388608f) - 1f;
                low += (noise - low) * 0.018f;
                slower += (low - slower) * 0.025f;
                float t = (float)i / sampleRate;

                // Air through old window, distant timber settling, no loud jump scares.
                float air = low * 0.42f + slower * 0.72f;
                float roomTone = Mathf.Sin(t * 2f * Mathf.PI * 47f) * 0.012f
                               + Mathf.Sin(t * 2f * Mathf.PI * 71f) * 0.006f;
                float creakEnvelope = Mathf.Pow(Mathf.Clamp01(Mathf.Sin(t * 2f * Mathf.PI / 7.3f + 1.1f) * 0.5f + 0.5f), 10f);
                float creak = Mathf.Sin(t * 2f * Mathf.PI * (115f + 14f * Mathf.Sin(t * 0.7f))) * creakEnvelope * 0.018f;
                float value = Mathf.Clamp((air + roomTone + creak) * 0.72f, -0.12f, 0.12f);
                samples[i * 2] = value;
                samples[i * 2 + 1] = value * 0.96f;
            }

            AudioClip clip = AudioClip.Create("LORGUS - old room ambience", count, 2, sampleRate, false);
            clip.SetData(samples, 0);
            var sourceObject = new GameObject("Room ambience audio");
            sourceObject.transform.SetParent(transform, false);
            var source = sourceObject.AddComponent<AudioSource>();
            source.clip = clip;
            source.loop = true;
            source.playOnAwake = true;
            source.volume = 0.22f;
            source.spatialBlend = 0f;
            source.priority = 0;
            source.dopplerLevel = 0f;
            source.Play();
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

            // Do not construct a Material from a shader that may have been stripped in a player build.
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