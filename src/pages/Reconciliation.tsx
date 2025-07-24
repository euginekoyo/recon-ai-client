import { useState, useCallback } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface ReconciledRecord {
  id: string;
  transactionId: string;
  amount: number;
  description: string;
  date: string;
  status: 'matched' | 'unmatched' | 'disputed';
  bankRecord?: {
    amount: number;
    date: string;
    reference: string;
  };
  systemRecord?: {
    amount: number;
    date: string;
    reference: string;
  };
}

interface ReconciliationResult {
  totalRecords: number;
  matchedRecords: number;
  unmatchedRecords: number;
  disputedRecords: number;
  records: ReconciledRecord[];
}

const Reconciliation = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [reconciliationData, setReconciliationData] = useState<ReconciliationResult | null>(null);
  const { toast } = useToast();

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/pdf'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV, Excel, or PDF file.",
          variant: "destructive",
        });
        return;
      }

      setUploadedFile(file);
    }
  }, [toast]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      const allowedTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/pdf'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV, Excel, or PDF file.",
          variant: "destructive",
        });
        return;
      }

      setUploadedFile(file);
    }
  }, [toast]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const processReconciliation = async () => {
    if (!uploadedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      // Replace with your actual endpoint
      const response = await fetch('/api/reconcile', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process reconciliation');
      }

      const result: ReconciliationResult = await response.json();
      setReconciliationData(result);
      
      toast({
        title: "Reconciliation Complete",
        description: `Processed ${result.totalRecords} records with ${result.matchedRecords} matches.`,
      });
    } catch (error) {
      toast({
        title: "Reconciliation Failed",
        description: "There was an error processing your file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setReconciliationData(null);
  };

  const getStatusBadge = (status: ReconciledRecord['status']) => {
    switch (status) {
      case 'matched':
        return <Badge variant="default" className="bg-success text-success-foreground">Matched</Badge>;
      case 'unmatched':
        return <Badge variant="secondary">Unmatched</Badge>;
      case 'disputed':
        return <Badge variant="destructive">Disputed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reconciliation</h1>
        <p className="text-muted-foreground mt-2">
          Upload bank statements or transaction files to reconcile with your system records
        </p>
      </div>

      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>File Upload</CardTitle>
          <CardDescription>
            Upload CSV, Excel, or PDF files containing transaction data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!uploadedFile ? (
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Upload Transaction File</h3>
              <p className="text-muted-foreground mb-4">
                Drag and drop your file here, or click to browse
              </p>
              <p className="text-sm text-muted-foreground">
                Supports CSV, Excel (.xlsx, .xls), and PDF files
              </p>
              <input
                id="file-upload"
                type="file"
                accept=".csv,.xlsx,.xls,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{uploadedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {!reconciliationData && (
                  <Button 
                    onClick={processReconciliation}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Process Reconciliation'
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={removeFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reconciliation Results */}
      {reconciliationData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{reconciliationData.totalRecords}</p>
                    <p className="text-sm text-muted-foreground">Total Records</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-2xl font-bold text-success">{reconciliationData.matchedRecords}</p>
                    <p className="text-sm text-muted-foreground">Matched</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-warning" />
                  <div>
                    <p className="text-2xl font-bold text-warning">{reconciliationData.unmatchedRecords}</p>
                    <p className="text-sm text-muted-foreground">Unmatched</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <X className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-2xl font-bold text-destructive">{reconciliationData.disputedRecords}</p>
                    <p className="text-sm text-muted-foreground">Disputed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Results Table */}
          <Card>
            <CardHeader>
              <CardTitle>Reconciliation Details</CardTitle>
              <CardDescription>
                Detailed breakdown of all processed records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bank Record</TableHead>
                    <TableHead>System Record</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reconciliationData.records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono text-sm">{record.transactionId}</TableCell>
                      <TableCell>{record.description}</TableCell>
                      <TableCell>{formatCurrency(record.amount)}</TableCell>
                      <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>
                        {record.bankRecord ? (
                          <div className="text-sm">
                            <div>{formatCurrency(record.bankRecord.amount)}</div>
                            <div className="text-muted-foreground">{record.bankRecord.reference}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.systemRecord ? (
                          <div className="text-sm">
                            <div>{formatCurrency(record.systemRecord.amount)}</div>
                            <div className="text-muted-foreground">{record.systemRecord.reference}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Reconciliation;