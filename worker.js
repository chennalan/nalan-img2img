/**
 * @author: kared
 * @create_date: 2025-05-10 21:15:59
 * @last_editors: kared
 * @last_edit_time: 2025-05-11 01:25:36
 * @description: This Cloudflare Worker script handles image generation.
 */

// import html template
import HTML from './index.html';

// Available models list
const AVAILABLE_MODELS = [
  {
    id: 'stable-diffusion-xl-base-1.0',
    name: 'Stable Diffusion XL Base 1.0',
    description: 'Stability AI SDXL 文生图模型',
    key: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    requiresImage: false
  },
  {
    id: 'flux-1-schnell',
    name: 'FLUX.1 [schnell]',
    description: '精确细节表现的高性能文生图模型',
    key: '@cf/black-forest-labs/flux-1-schnell',
    requiresImage: false
  },
  {
    id: 'dreamshaper-8-lcm',
    name: 'DreamShaper 8 LCM',
    description: '增强图像真实感的 SD 微调模型',
    key: '@cf/lykon/dreamshaper-8-lcm',
    requiresImage: false
  },
  {
    id: 'stable-diffusion-xl-lightning',
    name: 'Stable Diffusion XL Lightning',
    description: '更加高效的文生图模型',
    key: '@cf/bytedance/stable-diffusion-xl-lightning',
    requiresImage: false
  },
  {
    id: 'stable-diffusion-v1-5-img2img',
    name: 'Stable Diffusion v1.5 图生图',
    description: '将输入图像风格化或变换（需要提供图像URL）',
    key: '@cf/runwayml/stable-diffusion-v1-5-img2img',
    requiresImage: true
  },
  {
    id: 'stable-diffusion-v1-5-inpainting',
    name: 'Stable Diffusion v1.5 局部重绘',
    description: '根据遮罩对局部区域进行重绘（需要图像URL，可选遮罩URL）',
    key: '@cf/runwayml/stable-diffusion-v1-5-inpainting',
    requiresImage: true,
    requiresMask: true
  }
];

// Random prompts list
const RANDOM_PROMPTS = [
  'cyberpunk cat samurai graphic art, blood splattered, beautiful colors',
  '1girl, solo, outdoors, camping, night, mountains, nature, stars, moon, tent, twin ponytails, green eyes, cheerful, happy, backpack, sleeping bag, camping stove, water bottle, mountain boots, gloves, sweater, hat, flashlight,forest, rocks, river, wood, smoke, shadows, contrast, clear sky, constellations, Milky Way',
  'masterpiece, best quality, amazing quality, very aesthetic, high resolution, ultra-detailed, absurdres, newest, scenery, anime, anime coloring, (dappled sunlight:1.2), rim light, backlit, dramatic shadow, 1girl, long blonde hair, blue eyes, shiny eyes, parted lips, medium breasts, puffy sleeve white dress, forest, flowers, white butterfly, looking at viewer',
  'frost_glass, masterpiece, best quality, absurdres, cute girl wearing red Christmas dress, holding small reindeer, hug, braided ponytail, sidelocks, hairclip, hair ornaments, green eyes, (snowy forest, moonlight, Christmas trees), (sparkles, sparkling clothes), frosted, snow, aurora, moon, night, sharp focus, highly detailed, abstract, flowing',
  '1girl, hatsune miku, white pupils, power elements, microphone, vibrant blue color palette, abstract,abstract background, dreamlike atmosphere, delicate linework, wind-swept hair, energy, masterpiece, best quality, amazing quality',
  'cyberpunk cat(neon lights:1.3) clutter,ultra detailed, ctrash, chaotic, low light, contrast, dark, rain ,at night ,cinematic , dystopic, broken ground, tunnels, skyscrapers',
  'Cyberpunk catgirl with purple hair, wearing leather and latex outfit with pink and purple cheetah print, holding a hand gun, black latex brassiere, glowing blue eyes with purple tech sunglasses, tail, large breasts, glowing techwear clothes, handguns, black leather jacket, tight shiny leather pants, cyberpunk alley background, Cyb3rWar3, Cyberware',
  'a wide aerial view of a floating elven city in the sky, with two elven figures walking side by side across a glowing skybridge, the bridge arching between tall crystal towers, surrounded by clouds and golden light, majestic and serene atmosphere, vivid style, magical fantasy architecture',
  'masterpiece, newest, absurdres,incredibly absurdres, best quality, amazing quality, very aesthetic, 1girl, very long hair, blonde, multi-tied hair, center-flap bangs, sunset, cumulonimbus cloud, old tree,sitting in tree, dark blue track suit, adidas, simple bird',
  'beautiful girl, breasts, curvy, looking down scope, looking away from viewer, laying on the ground, laying ontop of jacket, aiming a sniper rifle, dark braided hair, backwards hat, armor, sleeveless, arm sleeve tattoos, muscle tone, dogtags, sweaty, foreshortening, depth of field, at night, night, alpine, lightly snowing, dusting of snow, Closeup, detailed face, freckles',
];

// Passwords for authentication


export default {
  async fetch(request, env) {
    const passwordConfigured = typeof env.APP_PASSWORD === 'string' && env.APP_PASSWORD.length >= 12;
    const PASSWORDS = passwordConfigured ? [env.APP_PASSWORD] : [];
    const originalHost = request.headers.get("host");

    // CORS Headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // process api requests
      if (path === '/api/models') {
        // get available models list
        return new Response(JSON.stringify(AVAILABLE_MODELS), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } else if (path === '/api/prompts') {
        // get random prompts list
        return new Response(JSON.stringify(RANDOM_PROMPTS), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } else if (path === '/api/config') {
        // expose minimal config to client
        return new Response(JSON.stringify({ require_password: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else if (path === '/api/auth' && request.method === 'POST') {
        // perform password authentication and set cookie
        const data = await request.json().catch(() => ({}));
        const ok = passwordConfigured && data && typeof data.password === 'string' && PASSWORDS.includes(data.password);
        if (!ok) {
          return new Response(JSON.stringify({ error: '密码错误' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const cookie = `auth=1; Path=/; Max-Age=${7 * 24 * 3600}; HttpOnly; SameSite=Lax; Secure`;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Set-Cookie': cookie }
        });
      } else if (request.method === 'POST') {
        // process POST request for image generation
        if (!passwordConfigured) return new Response(JSON.stringify({ error: '管理员尚未配置 APP_PASSWORD 密钥' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        const data = await request.json();
        
        // Check if password is required and valid (Cookie or request body)
        const cookieHeader = request.headers.get('cookie') || '';
        const authedByCookie = /(?:^|;\s*)auth=1(?:;|$)/.test(cookieHeader);
        const authedByBody = data && typeof data.password === 'string' && PASSWORDS.includes(data.password);
        if (PASSWORDS.length > 0 && !(authedByCookie || authedByBody)) {
          return new Response(JSON.stringify({ error: '需要正确的访问密码' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        if (data.action === 'enhance_prompt') {
          const userPrompt = String(data.prompt || '').trim();
          const style = String(data.style || 'portrait').slice(0, 80);
          if (!userPrompt) return new Response(JSON.stringify({ error: '请先输入中文提示词' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          try {
            const result = await env.AI.run('@cf/zai-org/glm-4.7-flash', {
              messages: [
                { role: 'system', content: '你是专业的人像摄影与图像生成提示词设计师。用户使用中文。请将用户的中文描述优化成适合图像生成模型的英文正向提示词，并生成英文 negative prompt。优先保留人物身份、脸型、五官、年龄感、发型、肤色、姿势和服装等用户明确要求；证件照要真实、端正、自然，不夸张磨皮，不改变身份，不虚构证件信息。输出必须是严格 JSON 对象，格式为 {"prompt":"...","negative_prompt":"...","notes":"中文简短说明"}，不要 Markdown。' },
                { role: 'user', content: '风格/用途：' + style + '\n用户原始中文描述：' + userPrompt }
              ],
              max_tokens: 700,
              temperature: 0.35
            });
            let raw = result?.response || result?.result?.response || result?.output_text || '';
            if (!raw && typeof result === 'string') raw = result;
            raw = String(raw).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
            let parsed;
            try { parsed = JSON.parse(raw); } catch (_) {
              const match = raw.match(/\{[\s\S]*\}/);
              if (match) { try { parsed = JSON.parse(match[0]); } catch (_) {} }
            }
            if (!parsed || !parsed.prompt) return new Response(JSON.stringify({ error: '提示词优化模型返回格式异常，请重试', detail: raw.slice(0, 300) }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            return new Response(JSON.stringify({ prompt: String(parsed.prompt), negative_prompt: String(parsed.negative_prompt || ''), notes: String(parsed.notes || '') }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          } catch (error) {
            console.error('Prompt enhancement failed:', error);
            return new Response(JSON.stringify({ error: '中文提示词优化暂时失败，请稍后重试', detail: String(error?.message || error).slice(0, 240) }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        }

        if ('prompt' in data && 'model' in data) {
          const selectedModel = AVAILABLE_MODELS.find(m => m.id === data.model);
          if (!selectedModel) {
            return new Response(JSON.stringify({ error: 'Model is invalid' }), { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          
          const model = selectedModel.key;
          let inputs = {};
          const fetchImageToBytes = async (url, label) => {
            const resp = await fetch(url);
            if (!resp.ok) {
              return { error: `${label}获取失败，HTTP ${resp.status}` };
            }
            const ct = resp.headers.get('content-type') || '';
            if (!ct.startsWith('image/')) {
              return { error: `${label}不是图片资源，content-type=${ct}` };
            }
            const cl = parseInt(resp.headers.get('content-length') || '0', 10);
            // 设定 10MB 上限，避免大文件触发内部错误
            if (cl && cl > 10 * 1024 * 1024) {
              return { error: `${label}体积过大(${(cl/1024/1024).toFixed(2)}MB)，请不超过10MB` };
            }
            const bytes = new Uint8Array(await resp.arrayBuffer());
            return { bytes, contentType: ct, size: bytes.length };
          };
          const decodeDataUrlToBytes = (dataUrl, label) => {
            const match = typeof dataUrl === 'string' && dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\\r\\n]+)$/);
            if (!match) return { error: `${label}格式无效，请上传 PNG/JPEG/WebP 图片` };
            const binary = atob(match[2]);
            if (binary.length > 10 * 1024 * 1024) return { error: `${label}体积过大，请不超过10MB` };
            return { bytes: Uint8Array.from(binary, c => c.charCodeAt(0)), contentType: match[1], size: binary.length };
          };
          const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
          const sanitizeDimension = (val, def = 512) => {
            let v = typeof val === 'number' ? val : def;
            v = clamp(v, 256, 2048);
            // 四舍五入到最近的64倍数
            v = Math.round(v / 64) * 64;
            return v;
          };
          
          // Input parameter processing
          if (data.model === 'flux-1-schnell') {
            let steps = data.num_steps || 6;
            if (steps >= 8) steps = 8;
            else if (steps <= 4) steps = 4;
            
            // Only prompt and steps
            inputs = {
              prompt: data.prompt || 'cyberpunk cat',
              steps: steps
            };
          } else if (
            data.model === 'stable-diffusion-v1-5-img2img' ||
            data.model === 'stable-diffusion-v1-5-inpainting'
          ) {
            // 图生图 / 局部重绘需要图像URL
            if (!data.image_url && !data.image_data) {
              return new Response(JSON.stringify({ error: '请填写输入图像 URL 或直接上传图片' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }

            // 拉取输入图像/遮罩为二进制并校验
            const imageResult = data.image_data ? decodeDataUrlToBytes(data.image_data, '输入图像') : await fetchImageToBytes(data.image_url, '输入图像');
            if (imageResult.error) {
              return new Response(JSON.stringify({ error: imageResult.error }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }

            let maskBytes = undefined;
            if (data.model === 'stable-diffusion-v1-5-inpainting') {
              if (!data.mask_url && !data.mask_data) {
                return new Response(JSON.stringify({ error: '局部重绘需要提供遮罩 URL 或上传遮罩图片' }), {
                  status: 400,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
              }
              const maskResult = data.mask_data ? decodeDataUrlToBytes(data.mask_data, '遮罩图像') : await fetchImageToBytes(data.mask_url, '遮罩图像');
              if (maskResult.error) {
                return new Response(JSON.stringify({ error: maskResult.error }), {
                  status: 400,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
              }
              maskBytes = maskResult.bytes;
            }

            // 兼容一些模型对字段命名的要求：有的需要 mask_image
            inputs = {
              prompt: data.prompt || 'cyberpunk cat',
              negative_prompt: data.negative_prompt || '',
              // 建议使用更小的分辨率，避免 3001 内部错误
              height: sanitizeDimension(parseInt(data.height, 10) || 512, 512),
              width: sanitizeDimension(parseInt(data.width, 10) || 512, 512),
              num_steps: clamp(parseInt(data.num_steps, 10) || 20, 1, 50),
              strength: clamp(parseFloat(data.strength ?? 0.8), 0.0, 1.0),
              guidance: clamp(parseFloat(data.guidance ?? 7.5), 0.0, 30.0),
              seed: data.seed || parseInt((Math.random() * 1024 * 1024).toString(), 10),
              image: [...imageResult.bytes],
              ...(maskBytes ? { mask: [...maskBytes], mask_image: [...maskBytes] } : {})
            };
          } else {
            // Default input parameters
            inputs = {
              prompt: data.prompt || 'cyberpunk cat',
              negative_prompt: data.negative_prompt || '',
              height: data.height || 1024,
              width: data.width || 1024,
              num_steps: data.num_steps || 20,
              strength: data.strength || 0.1,
              guidance: data.guidance || 7.5,
              seed: data.seed || parseInt((Math.random() * 1024 * 1024).toString(), 10),
            };
          }

          console.log(`Generating image with ${model} and prompt: ${inputs.prompt.substring(0, 50)}...`);
          
          try {
            const numOutputs = clamp(parseInt(data.num_outputs, 10) || 1, 1, 8);
            const generateOnce = async (seedOffset = 0) => {
              const localInputs = { ...inputs };
              if (typeof localInputs.seed === 'number') localInputs.seed = localInputs.seed + seedOffset;
              const t0 = Date.now();
              const res = await env.AI.run(model, localInputs);
              const t1 = Date.now();
              return { res, seconds: (t1 - t0) / 1000 };
            };

            // helper: convert bytes to base64
            const bytesToBase64 = (bytes) => {
              let binary = '';
              const chunk = 0x8000;
              for (let i = 0; i < bytes.length; i += chunk) {
                const sub = bytes.subarray(i, i + chunk);
                binary += String.fromCharCode.apply(null, sub);
              }
              return btoa(binary);
            };

            if (numOutputs > 1) {
              const tasks = Array.from({ length: numOutputs }, (_, i) => generateOnce(i));
              const results = await Promise.all(tasks);
              const secondsAvg = results.reduce((s, r) => s + r.seconds, 0) / results.length;

              const images = [];
              for (const { res } of results) {
                if (data.model === 'flux-1-schnell') {
                  const json = typeof res === 'object' ? res : JSON.parse(res);
                  if (!json.image) throw new Error('Invalid response from FLUX: missing image');
                  images.push(`data:image/png;base64,${json.image}`);
                } else {
                  // binary bytes -> base64
                  let bytes;
                  if (res instanceof Uint8Array) bytes = res;
                  else if (res && typeof res === 'object' && typeof res.byteLength === 'number') bytes = new Uint8Array(res);
                  else bytes = new Uint8Array(await new Response(res).arrayBuffer());
                  images.push(`data:image/png;base64,${bytesToBase64(bytes)}`);
                }
              }

              return new Response(JSON.stringify({ images }), {
                headers: {
                  ...corsHeaders,
                  'Content-Type': 'application/json',
                  'X-Used-Model': selectedModel.id,
                  'X-Server-Seconds': secondsAvg.toFixed(3),
                }
              });
            }

            const { res: response, seconds: serverSeconds } = await generateOnce(0);
  
            // Processing the response of the flux-1-schnell model
            if (data.model === 'flux-1-schnell') {
              let jsonResponse;
  
              if (typeof response === 'object') {
                jsonResponse = response;
              } else {
                try {
                  jsonResponse = JSON.parse(response);
                } catch (e) {
                  console.error('Failed to parse JSON response:', e);
                  return new Response(JSON.stringify({ 
                    error: 'Failed to parse response',
                    details: e.message
                  }), { 
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                  });
                }
              }
  
              if (!jsonResponse.image) {
                return new Response(JSON.stringify({ 
                  error: 'Invalid response format',
                  details: 'Image data not found in response'
                }), { 
                  status: 500,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
              }
  
              try {
                // Convert from base64 to binary data
                const binaryString = atob(jsonResponse.image);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
  
                // Returns binary data in PNG format
                return new Response(bytes, {
                  headers: {
                    ...corsHeaders,
                    'content-type': 'image/png',
                    'X-Used-Model': selectedModel.id,
                    ...(inputs.seed ? { 'X-Seed': String(inputs.seed) } : {}),
                    'X-Image-Bytes': String(bytes.length),
                    'X-Server-Seconds': serverSeconds.toFixed(3),
                  },
                });
              } catch (e) {
                console.error('Failed to convert base64 to binary:', e);
                return new Response(JSON.stringify({ 
                  error: 'Failed to process image data',
                  details: e.message
                }), { 
                  status: 500,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
              }
            } else {
                // Return the response directly (binary)
                let imageByteSize = undefined;
                try {
                  if (response && typeof response === 'object') {
                    if (response instanceof Uint8Array) imageByteSize = response.length;
                    // ArrayBuffer has byteLength
                    if (typeof response.byteLength === 'number') imageByteSize = response.byteLength;
                  }
                } catch (_) {}

                return new Response(response, {
                  headers: {
                    ...corsHeaders,
                    'content-type': 'image/png',
                    'X-Used-Model': selectedModel.id,
                    ...(inputs.seed ? { 'X-Seed': String(inputs.seed) } : {}),
                    ...(imageByteSize ? { 'X-Image-Bytes': String(imageByteSize) } : {}),
                    'X-Server-Seconds': serverSeconds.toFixed(3),
                  },
                });
              }
            } catch (aiError) {
            console.error('AI generation error:', aiError);
            return new Response(JSON.stringify({ 
              error: 'Image generation failed',
              details: aiError && (aiError.message || aiError.toString()),
              model: selectedModel.id
            }), { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        } else {
          return new Response(JSON.stringify({ error: 'Missing required parameter: prompt or model' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }
      } else if (path.endsWith('.html') || path === '/') {
        // redirect to index.html for HTML requests
        return new Response(HTML.replace(/{{host}}/g, originalHost), {
          status: 200,
          headers: {
            ...corsHeaders,
            "content-type": "text/html"
          }
        });
      } else {
        return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  },
};
