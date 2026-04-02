import pkg from '../../../package.json';

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="card p-10">
        <h1 className="text-3xl font-bold text-slate-800 mb-4">关于 VoteFlow</h1>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-sm text-blue-700 font-semibold mb-4">
          <span>版本</span>
          <span>{pkg.version}</span>
        </div>
        <p className="text-slate-500 leading-relaxed">
          VoteFlow 是一个轻量的在线投票系统：支持创建投票、实时投票与结果展示。当前项目以演示与原型验证为目标，
          后续可以接入数据库与登录体系，扩展权限、统计、导出等能力。
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-6">
            <div className="text-sm font-semibold text-slate-700">核心能力</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 list-disc list-inside">
              <li>创建投票：标题、描述、选项、多选、截止时间</li>
              <li>参与投票：单选/多选校验，截止校验</li>
              <li>结果展示：进度条、复制分享链接</li>
            </ul>
          </div>
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-6">
            <div className="text-sm font-semibold text-slate-700">数据接口</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 list-disc list-inside">
              <li>GET /api/polls：列表（支持搜索/筛选/排序/分页）</li>
              <li>POST /api/polls：创建投票</li>
              <li>GET /api/polls/:id：投票详情</li>
              <li>POST /api/polls/:id/vote：提交投票</li>
              <li>DELETE /api/polls/:id：删除投票</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
