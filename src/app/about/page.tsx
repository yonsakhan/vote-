import pkg from '../../../package.json';
import AnimatedTitle from '@/components/animated-title';

export default function AboutPage() {
  const capabilityGroups = [
    {
      title: '当前能力',
      items: [
        '创建投票：标题、描述、选项、多选、截止时间',
        '账号体系：邮箱登录、短信登录、创建与投票关联用户',
        '投票能力：单选/多选校验、截止校验、重复投票保护',
        '个人视图：我的投票、我参与的投票、结果页分享',
      ],
    },
    {
      title: '技术栈',
      items: [
        'Next.js App Router + React 19 + TypeScript',
        'Supabase：认证、数据库、服务端管理接口',
        'Cloudflare Workers：OpenNext 适配部署',
        '本地测试：支持创建投票流程的一键回归脚本',
      ],
    },
    {
      title: '接口能力',
      items: [
        'GET /api/polls：列表、搜索、筛选、排序、分页',
        'POST /api/polls：登录后创建投票并写入选项',
        'GET /api/polls/:id：读取投票详情与选项',
        'POST /api/polls/:id/vote：提交投票并返回最新结果',
        'DELETE /api/polls/:id：删除指定投票',
      ],
    },
    {
      title: '当前状态',
      items: [
        '已修复残缺投票导致“创建失败但数据残留”的问题',
        '投票页会对缺少选项的异常数据给出明确提示',
        '支持本地开发、生产构建与 Cloudflare 预览验证',
        '后续可继续补充统计面板、导出能力与运营配置',
      ],
    },
  ];

  return (
    <div className="space-y-8">
      <section className="card px-8 py-10 sm:px-12 sm:py-12">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_240px] xl:items-start">
          <AnimatedTitle
            eyebrow="About the experience"
            title="让投票系统"
            highlight="拥有品牌级表现力"
            variant="page"
            description="VoteFlow 不只是一个简单的表单系统，它已经接入 Supabase 数据库与认证、支持个人记录、Cloudflare Workers 部署和本地回归测试，正在从工具演进成一套完整的投票体验产品。"
          />
          <div className="modern-card px-6 py-6">
            <div className="micro-label">Version</div>
            <div className="mt-3 text-4xl font-semibold hero-title-accent">{pkg.version}</div>
            <div className="mt-6 type-body text-secondary">
              聚焦现代前端质感、稳定数据流和可重复测试的投票产品骨架。
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        {capabilityGroups.map((group, index) => (
          <div
            key={group.title}
            className="card px-6 py-6 animate-fade-in-up"
            style={{ animationDelay: `${index * 0.06}s` }}
          >
            <div className="micro-label text-accent">{group.title}</div>
            <ul className="mt-5 space-y-3 type-body text-secondary">
              {group.items.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1 text-accent">✦</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
