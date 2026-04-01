import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const palette = ['#0d9488', '#0284c7', '#2563eb', '#7c3aed', '#0891b2', '#0f766e'];

const ResultsChart = ({ rows }) => {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="panel animate-fade-up" style={{ animationDelay: '210ms' }}>
        <h2 className="font-display text-xl font-semibold text-slate-900">Vote Distribution</h2>
        <div className="mt-5 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fill: '#334155', fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: '#334155', fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="voteCount" radius={[8, 8, 0, 0]}>
                {rows.map((_, idx) => (
                  <Cell key={`bar-${idx}`} fill={palette[idx % palette.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel animate-fade-up" style={{ animationDelay: '260ms' }}>
        <h2 className="font-display text-xl font-semibold text-slate-900">Share by Candidate</h2>
        <div className="mt-5 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip />
              <Pie data={rows} dataKey="voteCount" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={3}>
                {rows.map((_, idx) => (
                  <Cell key={`pie-${idx}`} fill={palette[idx % palette.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
};

export default ResultsChart;
