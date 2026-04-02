// Supabase Edge Function: 发送短信验证码（阿里云 SMS）
// 部署: supabase functions deploy send-sms

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SMSRequest {
  phone: string        // +8613800138000 格式
  code: string         // 6位验证码
}

// 阿里云短信签名和模板
const ALIYUN_ACCESS_KEY_ID = Deno.env.get('ALIYUN_ACCESS_KEY_ID') || ''
const ALIYUN_ACCESS_KEY_SECRET = Deno.env.get('ALIYUN_ACCESS_KEY_SECRET') || ''
const ALIYUN_SMS_SIGN_NAME = Deno.env.get('ALIYUN_SMS_SIGN_NAME') || '你的签名'
const ALIYUN_SMS_TEMPLATE_CODE = Deno.env.get('ALIYUN_SMS_TEMPLATE_CODE') || 'SMS_xxxxxxx'

// 简单的 HMAC-SHA1 签名
async function hmacSha1(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(message)
  )
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

// 生成阿里云请求签名
async function sign(params: Record<string, string>, accessKeySecret: string): Promise<string> {
  // 1. 参数排序
  const sortedKeys = Object.keys(params).sort()
  const canonicalQueryString = sortedKeys
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&')
  
  // 2. 构造待签名字符串
  const stringToSign = `GET&${encodeURIComponent('/')}&${encodeURIComponent(canonicalQueryString)}`
  
  // 3. 计算签名
  const signature = await hmacSha1(`${accessKeySecret}&`, stringToSign)
  
  return signature
}

// 发送阿里云短信
async function sendAliyunSMS(phone: string, code: string): Promise<{ success: boolean; message: string }> {
  if (!ALIYUN_ACCESS_KEY_ID || !ALIYUN_ACCESS_KEY_SECRET) {
    return { success: false, message: '阿里云配置未设置' }
  }

  // 格式化手机号（去掉+86）
  const phoneNumber = phone.replace(/^\+86/, '')
  
  const params: Record<string, string> = {
    Format: 'JSON',
    Version: '2017-05-25',
    AccessKeyId: ALIYUN_ACCESS_KEY_ID,
    SignatureMethod: 'HMAC-SHA1',
    Timestamp: new Date().toISOString().replace(/\.\d{3}/, ''),
    SignatureVersion: '1.0',
    SignatureNonce: crypto.randomUUID(),
    Action: 'SendSms',
    PhoneNumbers: phoneNumber,
    SignName: ALIYUN_SMS_SIGN_NAME,
    TemplateCode: ALIYUN_SMS_TEMPLATE_CODE,
    TemplateParam: JSON.stringify({ code }),
  }

  // 计算签名
  params.Signature = await sign(params, ALIYUN_ACCESS_KEY_SECRET)

  // 发送请求
  const queryString = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&')
  
  const url = `https://dysmsapi.aliyuncs.com/?${queryString}`
  
  try {
    const response = await fetch(url, { method: 'GET' })
    const result = await response.json()
    
    if (result.Code === 'OK') {
      return { success: true, message: '短信发送成功' }
    } else {
      return { success: false, message: `发送失败: ${result.Message}` }
    }
  } catch (error) {
    return { success: false, message: `请求异常: ${error}` }
  }
}

serve(async (req) => {
  // 处理 CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone, code }: SMSRequest = await req.json()

    if (!phone || !code) {
      return new Response(
        JSON.stringify({ error: '缺少必要参数: phone, code' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // 验证手机号格式（中国大陆）
    const phoneRegex = /^\+86[1][3-9]\d{9}$/
    if (!phoneRegex.test(phone)) {
      return new Response(
        JSON.stringify({ error: '手机号格式不正确' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const result = await sendAliyunSMS(phone, code)

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: '服务器错误', message: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
