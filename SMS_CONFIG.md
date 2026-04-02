# Supabase 短信服务配置

## 方案一：Twilio（国际通用）

### 1. 注册 Twilio
- 访问 https://www.twilio.com/try-twilio
- 验证手机号完成注册
- 获取 Account SID 和 Auth Token
- 购买一个电话号码（Phone Number）

### 2. Supabase Dashboard 配置
1. 打开 https://app.supabase.com/project/kpdtfbhjxszbeujqouxc/settings/auth
2. 启用 **Phone Auth**
3. SMS Provider 选择 **Twilio**
4. 填写：
   ```
   Twilio Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   Twilio Auth Token: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   Twilio From Number: +1234567890 (你购买的号码)
   ```
5. 保存

### 3. 短信模板（可选）
在 Auth → Templates → SMS Message 中：
```
Your VoteFlow verification code is: {{ .Token }}
```

---

## 方案二：阿里云 SMS（国内推荐，便宜）

### 1. 注册阿里云并开通短信服务
- 访问 https://www.aliyun.com/product/sms
- 开通短信服务并实名认证
- 申请短信签名（如"投票系统"）
- 申请短信模板（如：您的验证码是${code}，5分钟内有效）

### 2. 获取 AccessKey
- 阿里云控制台 → 右上角头像 → AccessKey 管理
- 创建 AccessKey，记录：
  - AccessKey ID
  - AccessKey Secret

### 3. 部署 Edge Function

```bash
# 登录 Supabase CLI（如未安装：npm install -g supabase）
supabase login

# 关联项目
supabase link --project-ref kpdtfbhjxszbeujqouxc

# 部署短信函数
supabase functions deploy send-sms

# 设置环境变量
supabase secrets set ALIYUN_ACCESS_KEY_ID=你的AccessKeyID
supabase secrets set ALIYUN_ACCESS_KEY_SECRET=你的AccessKeySecret
supabase secrets set ALIYUN_SMS_SIGN_NAME=你的短信签名
supabase secrets set ALIYUN_SMS_TEMPLATE_CODE=SMS_XXXXXXX
```

### 4. 修改前端调用

需要修改登录页面的发送验证码逻辑，改为调用 Edge Function：

```typescript
// 替代原有的 supabase.auth.signInWithOtp({ phone })
const sendPhoneCode = async () => {
  // 生成6位验证码（存储在本地或后端）
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  
  // 调用 Edge Function 发送短信
  const response = await fetch(
    'https://kpdtfbhjxszbeujqouxc.supabase.co/functions/v1/send-sms',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        phone: formatPhone(phone),
        code
      })
    }
  )
  
  const result = await response.json()
  if (result.success) {
    // 存储验证码到 sessionStorage 用于后续验证
    sessionStorage.setItem('sms_code', code)
    sessionStorage.setItem('sms_phone', formatPhone(phone))
    setCodeSent(true)
    setCountdown(60)
  }
}

// 验证时
const verifyPhoneCode = async () => {
  const storedCode = sessionStorage.getItem('sms_code')
  const storedPhone = sessionStorage.getItem('sms_phone')
  
  if (code === storedCode && formatPhone(phone) === storedPhone) {
    // 验证通过，创建用户 session
    // 需要通过另一个 Edge Function 或直接使用 Supabase Auth
  }
}
```

---

## 方案三：腾讯云 SMS

与阿里云类似，需要：
1. 注册腾讯云并开通短信服务
2. 申请签名和模板
3. 获取 SecretId 和 SecretKey
4. 创建 Edge Function 调用腾讯云 API

---

## 费用对比

| 服务商 | 国内短信价格 | 国际短信 | 备注 |
|--------|-------------|----------|------|
| Twilio | ~$0.05/条 | ~$0.05/条 | 稳定，API友好 |
| 阿里云 | ~¥0.05/条 | 不支持 | 国内最便宜 |
| 腾讯云 | ~¥0.05/条 | 不支持 | 国内稳定 |

---

## 推荐方案

- **国际用户为主** → 直接用 Supabase 内置 Twilio
- **国内用户为主** → 阿里云/腾讯云 + Edge Function
- **混合用户** → 根据手机号前缀路由不同服务商

---

## 本地测试

使用测试模式（无需真实发送）：
在 Supabase Dashboard → Auth → Providers → Phone 中添加测试手机号和固定验证码。
