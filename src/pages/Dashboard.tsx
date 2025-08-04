import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  GitMerge,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Target,
  Zap,
  RefreshCw,
  Database,
  Shield,
  Users,
  Calendar,
  Filter,
  Settings,
  Bell,
  Download,
  Upload,
  Search,
  MoreHorizontal
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';

import { useGetBatchesQuery, useGetRecordsQuery } from '@/pages/Reconciliation/reconciliationApi';

const Dashboard = () => {
  const { data: batchesData, isLoading: isBatchesLoading, error: batchesError } = useGetBatchesQuery();

  // Get latest batch for records analysis
  const latestBatch = batchesData?.[0];
  const { data: recordsData, isLoading: isRecordsLoading } = useGetRecordsQuery(
      { id: latestBatch?.id || 0 },
      { skip: !latestBatch }
  );

  // Calculate real metrics from actual data
  const metrics = useMemo(() => {
    if (!batchesData || isBatchesLoading) return [];

    const totalBatches = batchesData.length;
    const completedBatches = batchesData.filter(b => b.status === 'completed').length;

    // Calculate average processing time for completed batches
    const avgProcessingTime = batchesData
        .filter(b => b.status === 'completed' && b.createdAt && b.updatedAt)
        .reduce((sum, batch) => {
          const start = new Date(batch.createdAt).getTime();
          const end = new Date(batch.updatedAt).getTime();
          return sum + (end - start);
        }, 0) / (completedBatches || 1) / 1000 / 60; // Convert to minutes

    // Calculate match rate from records if available
    let matchRate = 'N/A';
    let anomalies = 0;
    if (recordsData && !isRecordsLoading) {
      const totalRecordsInBatch = recordsData.length;
      const matchedRecords = recordsData.filter(r => r.matchStatus.toLowerCase().includes('full')).length;
      matchRate = totalRecordsInBatch > 0 ? `${((matchedRecords / totalRecordsInBatch) * 100).toFixed(1)}%` : '0%';
      anomalies = recordsData.filter(r => !r.matchStatus.toLowerCase().includes('full')).length;
    }

    return [
      {
        title: 'Total Batches',
        value: totalBatches.toLocaleString(),
        icon: Database,
        description: 'processed batches',
        color: 'from-blue-500 to-cyan-500'
      },
      {
        title: 'Match Rate',
        value: matchRate,
        icon: Target,
        description: 'accuracy achieved',
        color: 'from-emerald-500 to-green-500'
      },
      {
        title: 'Anomalies',
        value: anomalies.toLocaleString(),
        icon: AlertTriangle,
        description: 'requiring review',
        color: 'from-amber-500 to-orange-500'
      },
      {
        title: 'Avg Processing',
        value: avgProcessingTime > 0 ? `${avgProcessingTime.toFixed(1)}m` : 'N/A',
        icon: Zap,
        description: 'per batch',
        color: 'from-purple-500 to-indigo-500'
      }
    ];
  }, [batchesData, recordsData, isBatchesLoading, isRecordsLoading]);

  // Generate trend data from batches
  const trendData = useMemo(() => {
    if (!batchesData) return [];

    // Group batches by date for trend analysis
    const dateGroups = batchesData.reduce((acc, batch) => {
      const date = new Date(batch.createdAt).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { batches: 0, records: 0, completed: 0 };
      }
      acc[date].batches += 1;
      acc[date].records += batch.processedRecords || 0;
      if (batch.status === 'completed') acc[date].completed += 1;
      return acc;
    }, {});

    return Object.entries(dateGroups)
        .map(([date, data]) => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          batches: data.batches,
          records: data.records,
          completionRate: data.batches > 0 ? (data.completed / data.batches * 100) : 0
        }))
        .slice(-7); // Last 7 days
  }, [batchesData]);

  // Status distribution for chart
  const statusData = useMemo(() => {
    if (!batchesData) return [];

    const statusCounts = batchesData.reduce((acc, batch) => {
      acc[batch.status] = (acc[batch.status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: status === 'completed' ? '#10b981' :
          status === 'processing' ? '#3b82f6' : '#ef4444'
    }));
  }, [batchesData]);

  // Recent activity from batches
  const recentActivity = useMemo(() => {
    if (!batchesData) return [];

    return [...batchesData]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(batch => {
          const timeAgo = Math.round((Date.now() - new Date(batch.createdAt).getTime()) / (1000 * 60));
          return {
            id: batch.id,
            title: `Batch ${batch.id} - ${batch.backofficeFile?.split('/').pop()?.split('.')[0] || 'Unknown'}`,
            description: `${(batch.processedRecords || 0).toLocaleString()} records processed`,
            status: batch.status,
            time: timeAgo < 60 ? `${timeAgo}m ago` : `${Math.round(timeAgo / 60)}h ago`,
            user: batch.createdBy || 'System'
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
                <Button variant="outline" size="sm" className="bg-white/50 backdrop-blur-sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm" className="bg-white/50 backdrop-blur-sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  <Upload className="h-4 w-4 mr-2" />
                  New Batch
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;

              return (
                  <Card key={metric.title} className="group relative overflow-hidden bg-white/60 backdrop-blur-sm border-white/20 hover:bg-white/80 transition-all duration-300">
                    <div className={`absolute inset-0 bg-gradient-to-br ${metric.color} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
                    <CardContent className="p-6 relative">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-600">{metric.title}</p>
                          <p className="text-3xl font-bold text-slate-900">{metric.value}</p>
                          <p className="text-xs text-slate-500">{metric.description}</p>
                        </div>
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${metric.color} text-white shadow-lg group-hover:scale-110 transition-transform`}>
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
                    <XAxis
                        dataKey="date"
                        stroke="#64748b"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="#64748b"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: 'none',
                          borderRadius: '12px',
                          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                          backdropFilter: 'blur(10px)'
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
                          backdropFilter: 'blur(10px)'
                        }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity & Quick Actions */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <Card className="xl:col-span-2 bg-white/60 backdrop-blur-sm border-white/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-slate-800">Recent Activity</CardTitle>
                    <CardDescription>Latest batch processing events</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Bell className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg bg-white/50 hover:bg-white/70 transition-colors cursor-pointer group">
                      <div className={`p-2 rounded-lg ${
                          activity.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                              activity.status === 'processing' ? 'bg-blue-100 text-blue-600' :
                                  'bg-red-100 text-red-600'
                      }`}>
                        {activity.status === 'completed' ? <CheckCircle className="h-4 w-4" /> :
                            activity.status === 'processing' ? <Clock className="h-4 w-4" /> :
                                <AlertTriangle className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                          {activity.title}
                        </p>
                        <p className="text-xs text-slate-500">{activity.description}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">
                          {activity.status}
                        </Badge>
                        <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                      </div>
                    </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-white/60 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-slate-800">Quick Actions</CardTitle>
                <CardDescription>Common operations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { icon: GitMerge, label: 'New Reconciliation', gradient: 'from-blue-500 to-indigo-500' },
                  { icon: BarChart3, label: 'Analytics Report', gradient: 'from-emerald-500 to-teal-500' },
                  { icon: Settings, label: 'System Settings', gradient: 'from-purple-500 to-indigo-500' },
                  { icon: Shield, label: 'Audit Trail', gradient: 'from-amber-500 to-orange-500' },
                ].map((action) => (
                    <Button
                        key={action.label}
                        variant="ghost"
                        className="w-full justify-start h-12 bg-white/30 hover:bg-white/50 group"
                    >
                      <div className={`p-2 rounded-lg bg-gradient-to-r ${action.gradient} text-white mr-3 group-hover:scale-110 transition-transform`}>
                        <action.icon className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-slate-700 group-hover:text-slate-900">
                    {action.label}
                  </span>
                    </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
};

export default Dashboard;