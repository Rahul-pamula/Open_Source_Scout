export default function DashboardPage() {
  const activeAgents = [
    { id: 1, name: 'Frontend Subagent', status: 'Active', currentTask: 'Implement Dashboard' },
    { id: 2, name: 'Backend Subagent', status: 'Idle', currentTask: 'None' },
  ];

  const recentTasks = [
    { id: 101, title: 'Fix login bug', status: 'Completed', date: '2023-10-20' },
    { id: 102, title: 'Update dependencies', status: 'In Progress', date: '2023-10-21' },
    { id: 103, title: 'Write tests for API', status: 'Pending', date: '2023-10-22' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8">Unified Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Active Agents Section */}
        <section className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Active Agents</h2>
          <div className="space-y-4">
            {activeAgents.map((agent) => (
              <div key={agent.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-lg text-gray-900">{agent.name}</h3>
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full ${agent.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800'}`}
                  >
                    {agent.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600">Current Task: {agent.currentTask}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Tasks Section */}
        <section className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Recent Tasks</h2>
          <div className="space-y-4">
            {recentTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 border border-gray-200 rounded-lg bg-gray-50 flex flex-col"
              >
                <h3 className="font-medium text-lg mb-1 text-gray-900">{task.title}</h3>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span className="font-medium">Status: {task.status}</span>
                  <span>{task.date}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
