import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Users,
  CreditCard,
  GitMerge,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

const Dashboard = () => {
  const stats = [
    {
      title: 'Total Revenue',
      value: '$2,847,562',
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      description: 'vs last month'
    },
    {
      title: 'Transactions',
      value: '15,847',
      change: '+8.2%',
      trend: 'up',
      icon: CreditCard,
      description: 'processed today'
    },
    {
      title: 'Reconciled',
      value: '94.2%',
      change: '+2.1%',
      trend: 'up',
      icon: GitMerge,
      description: 'success rate'
    },
    {
      title: 'Active Users',
      value: '847',
      change: '-2.4%',
      trend: 'down',
      icon: Users,
      description: 'this week'
    }
  ];

  const recentTransactions = [
    {
      id: '1',
      type: 'Credit',
      amount: '+$2,500.00',
      description: 'Payment from Client ABC',
      status: 'completed',
      time: '2 minutes ago'
    },
    {
      id: '2',
      type: 'Debit',
      amount: '-$850.00',
      description: 'Office Supplies Purchase',
      status: 'pending',
      time: '15 minutes ago'
    },
    {
      id: '3',
      type: 'Credit',
      amount: '+$1,200.00',
      description: 'Subscription Revenue',
      status: 'completed',
      time: '1 hour ago'
    },
    {
      id: '4',
      type: 'Debit',
      amount: '-$3,200.00',
      description: 'Monthly Payroll',
      status: 'completed',
      time: '2 hours ago'
    }
  ];

  const reconciliationAlerts = [
    {
      id: '1',
      type: 'warning',
      message: '3 transactions require manual review',
      time: '5 minutes ago'
    },
    {
      id: '2',
      type: 'error',
      message: 'Bank connection timeout - retry needed',
      time: '15 minutes ago'
    },
    {
      id: '3',
      type: 'success',
      message: 'Daily reconciliation completed successfully',
      time: '1 hour ago'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your finances.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            Export Report
          </Button>
          <Button>
            <Activity className="h-4 w-4 mr-2" />
            View Analytics
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === 'up' ? ArrowUpRight : ArrowDownRight;
          
          return (
            <Card key={stat.title} className="hover:shadow-soft-lg transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </p>
                  </div>
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="flex items-center mt-4 text-sm">
                  <div className={`flex items-center gap-1 ${
                    stat.trend === 'up' ? 'text-success' : 'text-destructive'
                  }`}>
                    <TrendIcon className="h-4 w-4" />
                    <span className="font-medium">{stat.change}</span>
                  </div>
                  <span className="text-muted-foreground ml-2">
                    {stat.description}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              Latest financial activities and transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div 
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${
                      transaction.type === 'Credit' 
                        ? 'bg-success/10 text-success' 
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {transaction.type === 'Credit' ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {transaction.description}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.time}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      transaction.type === 'Credit' ? 'text-success' : 'text-foreground'
                    }`}>
                      {transaction.amount}
                    </p>
                    <Badge 
                      variant={transaction.status === 'completed' ? 'default' : 'outline'}
                      className="mt-1"
                    >
                      {transaction.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" className="w-full">
                View All Transactions
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reconciliation Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Reconciliation Alerts</CardTitle>
            <CardDescription>
              Important notifications and status updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reconciliationAlerts.map((alert) => (
                <div 
                  key={alert.id}
                  className="p-3 border rounded-lg"
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      alert.type === 'success' ? 'bg-success' :
                      alert.type === 'warning' ? 'bg-warning' : 'bg-destructive'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {alert.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {alert.time}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" className="w-full">
                View All Alerts
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Frequently used operations and shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col gap-2">
              <CreditCard className="h-6 w-6" />
              <span>New Transaction</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <GitMerge className="h-6 w-6" />
              <span>Run Reconciliation</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Activity className="h-6 w-6" />
              <span>Generate Report</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Users className="h-6 w-6" />
              <span>Manage Users</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;