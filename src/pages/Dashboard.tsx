import React, {useMemo} from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {AlertTriangle, Bell, CheckCircle, Clock, Database, MoreHorizontal, Target, Upload, Zap,} from 'lucide-react';
import {Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {useGetBatchesQuery, useGetRecordsQuery, useGetStatusCountsQuery} from '@/store/redux/reconciliationApi';
import {useNavigate} from 'react-router-dom';

interface StatusCounts {
  MATCH: number;
  PARTIAL_MATCH: number;
  MISMATCH: number;
  DUPLICATE: number;
  MISSING: number;
}

const StatusDashboard: React.FC<{ batchId: number }> = ({batchId}) => {
  const {data: counts, isLoading, error} = useGetStatusCountsQuery(batchId);

  if (isLoading) {
    return (
        <div className="flex items-center space-x-3 p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-slate-600 text-sm">Loading status counts...</span>
        </div>
    );
  }

  if (error) {
    return (
        <div className="flex items-center space-x-3 p-4 text-red-600">
          <AlertTriangle className="h-5 w-5"/>
          <span className="text-sm font-medium">Failed to load status counts</span>
        </div>
    );
  }

  const statusLabels = {
    MATCH: 'Match',
    PARTIAL_MATCH: 'Partial Match',
    MISMATCH: 'Mismatch',
    DUPLICATE: 'Duplicate',
    MISSING: 'Missing',
  };

  return (
      <div className="status-cards grid grid-cols-2 md:grid-cols-5 gap-4">
        {['MATCH', 'PARTIAL_MATCH', 'MISMATCH', 'DUPLICATE', 'MISSING'].map((status) => (
            <div
                key={status}
                className={`status-card p-4 rounded-lg bg-white/50 backdrop-blur-sm border border-white/20 ${status.toLowerCase()}`}
            >
              <h3 className="text-sm font-medium text-slate-800">{statusLabels[status]}</h3>
              <p className="text-xl font-bold text-slate-900">{counts?.[status] || 0} records</p>
            </div>
        ))}
      </div>
  );
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: batchesData, isLoading: isBatchesLoading, error: batchesError } = useGetBatchesQuery();
  const latestBatch = batchesData?.[0];
  const { data: recordsData, isLoading: isRecordsLoading } = useGetRecordsQuery(
      { id: latestBatch?.id || 0 },
      { skip: !latestBatch }
  );

  const metrics = useMemo(() => {
    if (!batchesData || isBatchesLoading || !recordsData || isRecordsLoading) {
      return [
        {
          title: 'Total Batches',
          value: 'N/A',
          icon: Database,
          description: 'processed batches',
          color: 'from-blue-500 to-cyan-500',
        },
        {
          title: 'Match Rate',
          value: 'N/A',
          icon: Target,
          description: 'accuracy achieved',
          color: 'from-emerald-500 to-green-500',
        },
        {
          title: 'Anomalies',
          value: 'N/A',
          icon: AlertTriangle,
          description: 'requiring review',
          color: 'from-amber-500 to-orange-500',
        },
        {
          title: 'Avg Processing',
          value: 'N/A',
          icon: Zap,
          description: 'per batch',
          color: 'from-purple-500 to-indigo-500',
        },
      ];
    }

    const totalBatches = batchesData.length;
    const completedBatches = batchesData.filter((b) => b.status === 'COMPLETED').length;

    const avgProcessingTime =
        batchesData
            .filter((b) => b.status === 'COMPLETED' && b.createdAt && b.updatedAt)
            .reduce((sum, batch) => {
              const start = new Date(batch.createdAt).getTime();
              const end = new Date(batch.updatedAt).getTime();
              return sum + (end - start);
            }, 0) /
        (completedBatches || 1) /
        1000 /
        60; // Convert to minutes

    const totalRecords = recordsData.length;
    const matchedRecords = recordsData.filter((r) => r.status === 'MATCH').length;
    const matchRate = totalRecords > 0 ? ((matchedRecords / totalRecords) * 100).toFixed(1) + '%' : '0%';
    const anomalies = batchesData.filter((r) => r.status === 'FAILED').length;

    return [
      {
        title: 'Total Batches',
        value: totalBatches.toLocaleString(),
        icon: Database,
        description: 'processed batches',
        color: 'from-blue-500 to-cyan-500',
      },
      {
        title: 'Match Rate',
        value: matchRate,
        icon: Target,
        description: 'accuracy achieved',
        color: 'from-emerald-500 to-green-500',
      },
      {
        title: 'Anomalies',
        value: anomalies.toLocaleString(),
        icon: AlertTriangle,
        description: 'requiring review',
        color: 'from-amber-500 to-orange-500',
      },
      {
        title: 'Avg Processing',
        value: avgProcessingTime > 0 ? `${avgProcessingTime.toFixed(1)}m` : 'N/A',
        icon: Zap,
        description: 'per batch',
        color: 'from-purple-500 to-indigo-500',
      },
    ];
  }, [batchesData, recordsData, isBatchesLoading, isRecordsLoading]);

  const trendData = useMemo(() => {
    if (!batchesData) return [];

    const dateGroups = batchesData.reduce((acc, batch) => {
      const date = new Date(batch.createdAt).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { batches: 0, records: 0, completed: 0 };
      }
      acc[date].batches += 1;
      acc[date].records += batch.processedRecords || 0;
      if (batch.status === 'COMPLETED') acc[date].completed += 1;
      return acc;
    }, {} as Record<string, { batches: number; records: number; completed: number }>);

    return Object.entries(dateGroups)
        .map(([date, data]) => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          batches: data.batches,
          records: data.records,
          completionRate: data.batches > 0 ? (data.completed / data.batches) * 100 : 0,
        }))
        .slice(-7); // Last 7 days
  }, [batchesData]);

  const statusData = useMemo(() => {
    if (!batchesData) return [];

    const statusCounts = batchesData.reduce((acc, batch) => {
      acc[batch.status] = (acc[batch.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase(),
      value: count,
      color:
          status.toUpperCase() === 'COMPLETED'
              ? '#10b981'
              : status.toUpperCase() === 'PROCESSING'
                  ? '#3b82f6'
                  : '#ef4444',
    }));
  }, [batchesData]);

  const recentActivity = useMemo(() => {
    if (!batchesData) return [];

    return [...batchesData]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map((batch) => {
          const timeAgo = Math.round((Date.now() - new Date(batch.createdAt).getTime()) / (1000 * 60));
          return {
            id: batch.id,
            title: `Batch RB-${batch.id} - ${batch.backofficeFile?.split('/').pop()?.split('.')[0] || 'Unknown'}`,
            description: `${(batch.processedRecords || 0).toLocaleString()} records processed`,
            status: batch.status.toLowerCase(),
            time: timeAgo < 60 ? `${timeAgo}m ago` : `${Math.round(timeAgo / 60)}h ago`,
            user: batch.createdBy || 'System',
          };
        });
  }, [batchesData]);

  if (isBatchesLoading) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-slate-600 font-medium">Loading dashboard...</span>
          </div>
        </div>
    );
  }

  if (batchesError) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
          <Card className="p-6 max-w-md">
            <div className="flex items-center space-x-3 text-red-600">
              <AlertTriangle className="h-6 w-6" />
              <span className="font-medium">Failed to load dashboard data</span>
            </div>
          </Card>
        </div>
    );
  }

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Header */}
        <div className="bg-white/70 backdrop-blur-sm border-b border-white/20 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Reconciliation Dashboard
                </h1>
                <p className="text-slate-600 text-sm">Real-time insights and system performance</p>
              </div>
              <div className="flex items-center space-x-3">

                <Button
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    onClick={() => navigate('/reconciled')}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  View Batches
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                  <Card
                      key={metric.title}
                      className="group relative overflow-hidden bg-white/60 backdrop-blur-sm border-white/20 hover:bg-white/80 transition-all duration-300"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${metric.color} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
                    <CardContent className="p-6 relative">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-600">{metric.title}</p>
                          <p className="text-3xl font-bold text-slate-900">{metric.value}</p>
                          <p className="text-xs text-slate-500">{metric.description}</p>
                        </div>
                        <div
                            className={`p-3 rounded-xl bg-gradient-to-br ${metric.color} text-white shadow-lg group-hover:scale-110 transition-transform`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
              );
            })}
          </div>


          {/* Charts Section */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Trend Chart */}
            <Card className="xl:col-span-2 bg-white/60 backdrop-blur-sm border-white/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-slate-800">Processing Trends</CardTitle>
                    <CardDescription>Batch processing activity over time</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="batchGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false}/>
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false}/>
                    <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: 'none',
                          borderRadius: '12px',
                          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                          backdropFilter: 'blur(10px)',
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="batches"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        fill="url(#batchGradient)"
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card className="bg-white/60 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-slate-800">Batch Status</CardTitle>
                <CardDescription>Current processing distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={statusData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                    <XAxis type="number" stroke="#64748b" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} width={80} />
                    <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: 'none',
                          borderRadius: '12px',
                          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                          backdropFilter: 'blur(10px)',
                        }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="xl:col-span-2 bg-white/60 backdrop-blur-sm border-white/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-slate-800">Recent Activity</CardTitle>
                  <CardDescription>Latest batch processing events</CardDescription>
                </div>
                <Button variant="ghost" size="sm">
                  <Bell className="h-4 w-4"/>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivity.map((activity) => (
                  <div
                      key={activity.id}
                      className="flex items-center space-x-4 p-3 rounded-lg bg-white/50 hover:bg-white/70 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/reconciliation/results/RB-${activity.id}`)}
                  >
                    <div
                        className={`p-2 rounded-lg ${
                            activity.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-600'
                                : activity.status === 'processing'
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'bg-red-100 text-red-600'
                        }`}
                    >
                      {activity.status === 'completed' ? (
                          <CheckCircle className="h-4 w-4"/>
                      ) : activity.status === 'processing' ? (
                          <Clock className="h-4 w-4"/>
                      ) : (
                          <AlertTriangle className="h-4 w-4"/>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                        {activity.title}
                      </p>
                      <p className="text-xs text-slate-500">{activity.description}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">
                        {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                      </Badge>
                      <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                    </div>
                  </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
  );
};

export default Dashboard;
