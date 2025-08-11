import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Upload, FileText, X, CheckCircle, AlertCircle, Loader2, Building2, Users, ArrowRight, Clock, GitMerge, Play, Eye, RotateCcw, FileSpreadsheet, Target, Plus
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useGetTemplatesQuery, Template } from '../../store/redux/templateApi.ts';
import { useUploadReconciliationFilesMutation } from '../../store/redux/reconciliationApi.ts';
import { useNavigate } from 'react-router-dom';

interface BackofficeData {
  id: string;
  amount: number;
  direction: string;
  date: string;
  description: string;
  status: string;
  rawData: Record<string, any>;
}

interface VendorData {
  id: string;
  amount: number;
  direction: string;
  date: string;
  description: string;
  status: string;
  rawData: Record<string, any>;
}

interface UploadedFile {
  file: File;
  type: 'bank' | 'vendor';
  uploadTime: Date;
  status: 'uploaded' | 'validated' | 'error';
  errorMessage?: string;
  processedData?: any[];
  preview?: {
    totalRecords: number;
    dateRange: string;
    fileSize: string;
    fileType: string;
    sampleData?: Partial<BackofficeData | VendorData>;
  };
}

interface BatchDetails {
  batchId: string;
  createdAt: Date;
  bankFile: UploadedFile;
  vendorFile: UploadedFile;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimatedTime?: string;
  failureReason?: string;
}

const ReconciliationUpload: React.FC = () => {
  const navigate = useNavigate();
  const { data: templates = [], isLoading: isLoadingTemplates, error } = useGetTemplatesQuery();
  const [uploadReconciliationFiles, { isLoading: isUploading }] = useUploadReconciliationFilesMutation();
  const [bankFile, setBankFile] = useState<UploadedFile | null>(null);
  const [vendorFile, setVendorFile] = useState<UploadedFile | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [batchDetails, setBatchDetails] = useState<BatchDetails | null>(null);
  const [dragActive, setDragActive] = useState<'bank' | 'vendor' | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedBankTemplate, setSelectedBankTemplate] = useState<string>('');
  const [selectedVendorTemplate, setSelectedVendorTemplate] = useState<string>('');
  const [processingStep, setProcessingStep] = useState(0);

  const supportedFileTypes = {
    csv: 'text/csv',
    excel: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    pdf: 'application/pdf',
  };

  const allSupportedTypes = [supportedFileTypes.csv, ...supportedFileTypes.excel, supportedFileTypes.pdf];

  const getFileTypeInfo = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const type = file.type;
    if (type === supportedFileTypes.csv || extension === 'csv') {
      return { type: 'CSV', icon: FileSpreadsheet, color: 'bg-gradient-to-r from-teal-500 to-cyan-500' };
    } else if (supportedFileTypes.excel.includes(type) || ['xlsx', 'xls'].includes(extension || '')) {
      return { type: 'Excel', icon: FileSpreadsheet, color: 'bg-gradient-to-r from-blue-500 to-indigo-500' };
    } else if (type === supportedFileTypes.pdf || extension === 'pdf') {
      return { type: 'PDF', icon: FileText, color: 'bg-gradient-to-r from-red-500 to-rose-500' };
    }
    return { type: 'Unknown', icon: FileSpreadsheet, color: 'bg-gradient-to-r from-gray-500 to-slate-500' };
  };

  const inferFieldType = (coreField: string): 'string' | 'number' | 'date' => {
    if (['amount', 'credit_amount', 'debit_amount'].includes(coreField.toLowerCase())) {
      return 'number';
    } else if (coreField.toLowerCase() === 'date') {
      return 'date';
    }
    return 'string';
  };

  const validateFile = async (file: File, type: 'bank' | 'vendor'): Promise<UploadedFile> => {
    setIsValidating(true);
    try {
      const fileTypeInfo = getFileTypeInfo(file);
      const selectedTemplate = templates.find((t: Template) => t.id === (type === 'bank' ? selectedBankTemplate : selectedVendorTemplate));

      if (!selectedTemplate) {
        throw new Error(`No ${type} template selected.`);
      }

      let totalRecords = 0;
      let sampleData: Partial<BackofficeData | VendorData> | undefined;
      let dateRange = '';
      let processedData: any[] = [];

      if (fileTypeInfo.type === 'PDF') {
        return {
          file,
          type,
          uploadTime: new Date(),
          status: 'uploaded',
          preview: {
            totalRecords: 0,
            dateRange: 'Pending backend processing',
            fileSize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
            fileType: fileTypeInfo.type,
          },
        };
      }

      if (fileTypeInfo.type === 'CSV') {
        const data = await new Promise<any>((resolve) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (result) => resolve(result),
          });
        });

        totalRecords = data.data.length;
        processedData = data.data.map((row: any) => {
          return selectedTemplate.fields.reduce((acc, field) => {
            let value = row[field.fileHeader];
            if (value === undefined) value = '';
            const fieldType = field.type || inferFieldType(field.coreField);
            if (fieldType === 'number') value = parseFloat(value) || 0;
            if (fieldType === 'date') value = new Date(value).toISOString().split('T')[0] || value;
            return { ...acc, [field.coreField]: value };
          }, {} as any);
        });

        if (data.data.length > 0) {
          const firstRow = data.data[0];
          sampleData = selectedTemplate.fields.reduce((acc, field) => {
            let value = firstRow[field.fileHeader];
            if (value === undefined) value = '';
            const fieldType = field.type || inferFieldType(field.coreField);
            if (fieldType === 'number') value = parseFloat(value) || 0;
            if (fieldType === 'date') value = new Date(value).toISOString().split('T')[0] || value;
            return { ...acc, [field.coreField]: value };
          }, {} as Partial<BackofficeData | VendorData>);
          sampleData.rawData = firstRow;

          const dates = data.data
              .map((row: any) => {
                const dateField = selectedTemplate.fields.find(f => (f.type || inferFieldType(f.coreField)) === 'date')?.fileHeader;
                return dateField && row[dateField] ? new Date(row[dateField]) : null;
              })
              .filter((date: Date | null) => date && !isNaN(date.getTime()));

          if (dates.length > 0) {
            const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
            const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
            dateRange = `${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()}`;
          }
        }
      } else if (fileTypeInfo.type === 'Excel') {
        const data = await new Promise<any>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const workbook = XLSX.read(e.target?.result, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
            resolve(sheet);
          };
          reader.readAsBinaryString(file);
        });

        totalRecords = data.length;
        processedData = data.map((row: any) => {
          return selectedTemplate.fields.reduce((acc, field) => {
            let value = row[field.fileHeader];
            if (value === undefined) value = '';
            const fieldType = field.type || inferFieldType(field.coreField);
            if (fieldType === 'number') value = parseFloat(value) || 0;
            if (fieldType === 'date') value = new Date(value).toISOString().split('T')[0] || value;
            return { ...acc, [field.coreField]: value };
          }, {} as any);
        });

        if (data.length > 0) {
          const firstRow = data[0];
          sampleData = selectedTemplate.fields.reduce((acc, field) => {
            let value = firstRow[field.fileHeader];
            if (value === undefined) value = '';
            const fieldType = field.type || inferFieldType(field.coreField);
            if (fieldType === 'number') value = parseFloat(value) || 0;
            if (fieldType === 'date') value = new Date(value).toISOString().split('T')[0] || value;
            return { ...acc, [field.coreField]: value };
          }, {} as Partial<BackofficeData | VendorData>);
          sampleData.rawData = firstRow;

          const dates = data
              .map((row: any) => {
                const dateField = selectedTemplate.fields.find(f => (f.type || inferFieldType(f.coreField)) === 'date')?.fileHeader;
                return dateField && row[dateField] ? new Date(row[dateField]) : null;
              })
              .filter((date: Date | null) => date && !isNaN(date.getTime()));

          if (dates.length > 0) {
            const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
            const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
            dateRange = `${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()}`;
          }
        }
      } else {
        throw new Error('Unsupported file type. Please upload a CSV, Excel, or PDF file.');
      }

      return {
        file,
        type,
        uploadTime: new Date(),
        status: 'validated',
        processedData,
        preview: {
          totalRecords,
          dateRange: dateRange || 'Date range not available',
          fileSize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
          fileType: fileTypeInfo.type,
          sampleData,
        },
      };
    } catch (error: any) {
      return {
        file,
        type,
        uploadTime: new Date(),
        status: 'error',
        errorMessage: error.message || `Failed to validate ${getFileTypeInfo(file).type} file.`,
      };
    } finally {
      setIsValidating(false);
    }
  };

  const handleFileUpload = useCallback(
      async (event: React.ChangeEvent<HTMLInputElement>, type: 'bank' | 'vendor') => {
        const file = event.target.files?.[0];
        if (file) {
          if (!allSupportedTypes.includes(file.type)) {
            const extension = file.name.split('.').pop()?.toLowerCase();
            if (!['csv', 'xlsx', 'xls', 'pdf'].includes(extension || '')) {
              setUploadError('Please upload a CSV, Excel (.xlsx/.xls), or PDF file.');
              return;
            }
          }
          if ((type === 'bank' && !selectedBankTemplate) || (type === 'vendor' && !selectedVendorTemplate)) {
            setUploadError(`Please select a ${type} template before uploading.`);
            return;
          }
          const uploadedFile = await validateFile(file, type);
          if (type === 'bank') {
            setBankFile(uploadedFile);
          } else {
            setVendorFile(uploadedFile);
          }
          setUploadError(uploadedFile.status === 'error' ? uploadedFile.errorMessage : null);
        }
      },
      [selectedBankTemplate, selectedVendorTemplate, templates],
  );

  const handleDrop = useCallback(
      async (e: React.DragEvent<HTMLDivElement>, type: 'bank' | 'vendor') => {
        e.preventDefault();
        setDragActive(null);
        const file = e.dataTransfer.files[0];
        if (file) {
          if (!allSupportedTypes.includes(file.type)) {
            const extension = file.name.split('.').pop()?.toLowerCase();
            if (!['csv', 'xlsx', 'xls', 'pdf'].includes(extension || '')) {
              setUploadError('Please upload a CSV, Excel (.xlsx/.xls), or PDF file.');
              return;
            }
          }
          if ((type === 'bank' && !selectedBankTemplate) || (type === 'vendor' && !selectedVendorTemplate)) {
            setUploadError(`Please select a ${type} template before uploading.`);
            return;
          }
          const uploadedFile = await validateFile(file, type);
          if (type === 'bank') {
            setBankFile(uploadedFile);
          } else {
            setVendorFile(uploadedFile);
          }
          setUploadError(uploadedFile.status === 'error' ? uploadedFile.errorMessage : null);
        }
      },
      [selectedBankTemplate, selectedVendorTemplate, templates],
  );

  const startReconciliation = async () => {
    if (!bankFile || !vendorFile) {
      setUploadError('Please upload both bank and vendor files.');
      return;
    }
    if (!selectedBankTemplate || !selectedVendorTemplate) {
      setUploadError('Please select both bank and vendor templates.');
      return;
    }
    if (bankFile.status !== 'validated' && bankFile.status !== 'uploaded') {
      setUploadError('Bank file is not validated or uploaded correctly.');
      return;
    }
    if (vendorFile.status !== 'validated' && vendorFile.status !== 'uploaded') {
      setUploadError('Vendor file is not validated or uploaded correctly.');
      return;
    }
    setUploadError(null);
    setProcessingStep(0);

    try {
      const formData = new FormData();
      if (bankFile.status === 'validated') {
        const bankFileBlob = Papa.unparse(bankFile.processedData || []);
        formData.append('backofficeFile', new File([bankFileBlob], bankFile.file.name, { type: 'text/csv' }));
      } else {
        formData.append('backofficeFile', bankFile.file);
      }
      if (vendorFile.status === 'validated') {
        const vendorFileBlob = Papa.unparse(vendorFile.processedData || []);
        formData.append('vendorFile', new File([vendorFileBlob], vendorFile.file.name, { type: 'text/csv' }));
      } else {
        formData.append('vendorFile', vendorFile.file);
      }
      formData.append('backofficeTemplateId', selectedBankTemplate);
      formData.append('vendorTemplateId', selectedVendorTemplate);

      console.log('Starting reconciliation with:', {
        backofficeFile: bankFile.file.name,
        vendorFile: vendorFile.file.name,
        backofficeTemplateId: selectedBankTemplate,
        vendorTemplateId: selectedVendorTemplate,
      });

      setProcessingStep(1);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setProcessingStep(2);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setProcessingStep(3);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const result = await uploadReconciliationFiles({
        backofficeFile: bankFile.file,
        vendorFile: vendorFile.file,
        backofficeTemplateId: selectedBankTemplate,
        vendorTemplateId: selectedVendorTemplate,
      }).unwrap();

      console.log('Reconciliation response:', result);

      setProcessingStep(4);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const newBatch: BatchDetails = {
        batchId: result.batchId.toString(),
        createdAt: new Date(),
        bankFile,
        vendorFile,
        status: 'pending',
        estimatedTime: '3-5 minutes',
      };
      setBatchDetails(newBatch);
      navigate(`/reconciled`);
    } catch (error: any) {
      console.error('Reconciliation failed:', error);
      const errorMessage = error.data?.message || error.message || 'Failed to start reconciliation. Please check your files and templates.';
      setUploadError(errorMessage);
      setBatchDetails({
        batchId: `RB-${Date.now()}`,
        createdAt: new Date(),
        bankFile,
        vendorFile,
        status: 'failed',
        failureReason: errorMessage,
      });
    } finally {
      setProcessingStep(0);
    }
  };

  const removeFile = (type: 'bank' | 'vendor') => {
    if (type === 'bank') {
      setBankFile(null);
      setSelectedBankTemplate('');
    } else {
      setVendorFile(null);
      setSelectedVendorTemplate('');
    }
    setBatchDetails(null);
    setUploadError(null);
  };

  const resetAll = () => {
    setBankFile(null);
    setVendorFile(null);
    setSelectedBankTemplate('');
    setSelectedVendorTemplate('');
    setBatchDetails(null);
    setUploadError(null);
    setDragActive(null);
    setProcessingStep(0);
  };

  const FileUploadZone = ({
                            type,
                            file,
                            title,
                            description,
                            icon: Icon,
                          }: {
    type: 'bank' | 'vendor';
    file: UploadedFile | null;
    title: string;
    description: string;
    icon: React.ElementType;
  }) => {
    const isActive = dragActive === type;
    const hasFile = !!file;

    return (
        <div className={`relative transition-all duration-300 ${isActive ? 'scale-105' : ''}`}>
          <Card className={`
          border-none bg-white shadow-lg rounded-xl overflow-hidden
          ${isActive ? 'ring-2 ring-indigo-400 bg-indigo-50/50' : hasFile ? 'ring-2 ring-teal-400' : 'hover:ring-2 hover:ring-indigo-200'}
          transition-all duration-300
        `}>
            <CardContent className="p-6">
              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Target className="h-4 w-4 text-indigo-600" />
                  Select Template
                </label>
                <Select
                    value={type === 'bank' ? selectedBankTemplate : selectedVendorTemplate}
                    onValueChange={(value) => (type === 'bank' ? setSelectedBankTemplate(value) : setSelectedVendorTemplate(value))}
                    disabled={isLoadingTemplates}
                >
                  <SelectTrigger className="h-10 rounded-lg border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 transition-all">
                    <SelectValue placeholder={isLoadingTemplates ? 'Loading templates...' : `Select ${type} template`} />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-lg shadow-xl">
                    {isLoadingTemplates ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-500">Loading templates...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-rose-600">Failed to load templates</p>
                        </div>
                    ) : Array.isArray(templates) && templates.length > 0 ? (
                        templates
                            .filter((t: Template) => t.type === (type === 'bank' ? 'BACKOFFICE' : 'VENDOR'))
                            .map((template: Template) => (
                                <SelectItem key={template.id} value={template.id} className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                  {template.name}
                                </SelectItem>
                            ))
                    ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-500 mb-3">No templates available</p>
                          <Button
                              size="sm"
                              variant="outline"
                              className="border-dashed border-indigo-300 hover:bg-indigo-50"
                              onClick={() => navigate('/template')}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Template
                          </Button>
                        </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {!file ? (
                  <div
                      className={`
                  border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                  ${isActive ? 'border-indigo-400 bg-indigo-50/50' : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/30'}
                  transition-all duration-300
                `}
                      onDrop={(e) => handleDrop(e, type)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragActive(type);
                      }}
                      onDragLeave={() => setDragActive(null)}
                      onClick={() => document.getElementById(`file-upload-${type}`)?.click()}
                  >
                    <div className="space-y-4">
                      <div className={`
                    inline-flex p-4 rounded-xl ${isActive ? 'bg-indigo-500' : 'bg-gray-600 hover:bg-indigo-500'}
                    transition-all duration-300
                  `}>
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
                      <p className="text-gray-600 text-sm">{description}</p>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full font-medium">
                        <Upload className="h-4 w-4" />
                        {isActive ? 'Drop your file here' : 'Click or drag & drop'}
                      </div>
                      <div className="flex justify-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1 px-3 py-1 bg-teal-50 rounded-full">
                      <FileSpreadsheet className="h-3 w-3 text-teal-600" />
                      CSV/Excel
                    </span>
                        <span className="flex items-center gap-1 px-3 py-1 bg-rose-50 rounded-full">
                      <FileText className="h-3 w-3 text-rose-600" />
                      PDF
                    </span>
                      </div>
                    </div>
                    <input
                        id={`file-upload-${type}`}
                        type="file"
                        accept=".csv,.xlsx,.xls,.pdf"
                        onChange={(e) => handleFileUpload(e, type)}
                        className="hidden"
                    />
                  </div>
              ) : (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between p-4 bg-gray-50 rounded-xl border border-teal-100">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${getFileTypeInfo(file.file).color}`}>
                          {file.status === 'error' ? (
                              <AlertCircle className="h-5 w-5 text-white" />
                          ) : (
                              <CheckCircle className="h-5 w-5 text-white" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-800">{file.file.name}</p>
                            {file.preview && (
                                <Badge className={`${getFileTypeInfo(file.file).color} text-white`}>{file.preview.fileType}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">Uploaded {file.uploadTime.toLocaleTimeString()}</p>
                          {file.preview && file.status === 'validated' && (
                              <div className="grid grid-cols-3 gap-3 mt-3">
                                <div className="p-3 bg-white rounded-lg shadow-sm text-center">
                                  <p className="text-lg font-semibold text-gray-800">{file.preview.totalRecords.toLocaleString()}</p>
                                  <p className="text-xs text-gray-500">Records</p>
                                </div>
                                <div className="p-3 bg-white rounded-lg shadow-sm text-center">
                                  <p className="text-lg font-semibold text-gray-800">{file.preview.fileSize}</p>
                                  <p className="text-xs text-gray-500">Size</p>
                                </div>
                                <div className="p-3 bg-white rounded-lg shadow-sm text-center">
                                  <p className="text-xs font-semibold text-gray-800">{file.preview.dateRange}</p>
                                  <p className="text-xs text-gray-500">Date Range</p>
                                </div>
                              </div>
                          )}
                          {file.status === 'uploaded' && file.preview && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-600">File will be processed server-side.</p>
                              </div>
                          )}
                          {file.status === 'error' && file.errorMessage && (
                              <div className="mt-3 p-3 bg-rose-50 rounded-lg border border-rose-200">
                                <p className="text-xs text-rose-600">{file.errorMessage}</p>
                              </div>
                          )}
                        </div>
                      </div>
                      <Button
                          onClick={() => removeFile(type)}
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-rose-500 hover:bg-rose-50"
                          disabled={isValidating || isUploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
              )}
            </CardContent>
          </Card>
        </div>
    );
  };

  return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="text-center space-y-3 animate-fade-in">
            <h1 className="text-4xl font-bold text-gray-800">Reconciliation Upload</h1>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Upload bank statements and vendor reports to reconcile transactions effortlessly with our AI-powered platform.
            </p>
          </div>

          {(isValidating || isUploading) && (
              <Card className="border-none bg-white shadow-lg rounded-xl animate-fade-in">
                <CardContent className="p-6 flex items-center justify-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                  <span className="text-gray-700 font-medium">
                {isValidating ? 'Validating file...' :
                    isUploading ? ['Uploading files...', 'Processing data...', 'Creating batch...', 'Finalizing...'][processingStep] : ''}
              </span>
                  {isUploading && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(processingStep / 4) * 100}%` }}
                        ></div>
                      </div>
                  )}
                </CardContent>
              </Card>
          )}

          {uploadError && (
              <Card className="border-none bg-rose-50 shadow-lg rounded-xl animate-fade-in">
                <CardContent className="p-6 flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-rose-600" />
                  <div>
                    <p className="font-semibold text-rose-800">Error</p>
                    <p className="text-rose-600 text-sm">{uploadError}</p>
                  </div>
                </CardContent>
              </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FileUploadZone
                type="bank"
                file={bankFile}
                title="Bank Statement"
                description="Upload your bank statement in CSV, Excel, or PDF format."
                icon={Building2}
            />
            <FileUploadZone
                type="vendor"
                file={vendorFile}
                title="Vendor Report"
                description="Upload your vendor transaction report in CSV, Excel, or PDF format."
                icon={Users}
            />
          </div>

          {bankFile && vendorFile && !batchDetails && (
              <Card className="border-none bg-white shadow-lg rounded-xl animate-fade-in">
                <CardContent className="p-6 flex flex-col lg:flex-row items-center justify-between gap-6">
                  <div className="space-y-3 text-center lg:text-left">
                    <div className="flex items-center gap-3 justify-center lg:justify-start">
                      <GitMerge className="h-6 w-6 text-teal-600" />
                      <h3 className="text-xl font-semibold text-gray-800">Ready to Reconcile</h3>
                    </div>
                    <p className="text-gray-600 text-sm max-w-xl">
                      Files uploaded successfully. Start the AI-powered reconciliation to match transactions.
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                      {bankFile.preview && (
                          <span className="flex items-center gap-2 px-3 py-1 bg-teal-50 rounded-full text-sm text-teal-700">
                      <Building2 className="h-4 w-4" />
                            {bankFile.preview.totalRecords.toLocaleString()} bank records
                    </span>
                      )}
                      {vendorFile.preview && (
                          <span className="flex items-center gap-2 px-3 py-1 bg-teal-50 rounded-full text-sm text-teal-700">
                      <Users className="h-4 w-4" />
                            {vendorFile.preview.totalRecords.toLocaleString()} vendor records
                    </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={resetAll}
                        className="border-gray-300 hover:bg-gray-100"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                    <Button
                        onClick={startReconciliation}
                        size="lg"
                        disabled={isUploading || isValidating || !selectedBankTemplate || !selectedVendorTemplate || (bankFile?.status !== 'validated' && bankFile?.status !== 'uploaded') || (vendorFile?.status !== 'validated' && vendorFile?.status !== 'uploaded')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      {isUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                      ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Start Reconciliation
                          </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
          )}

          {batchDetails && (
              <Card className="border-none bg-white shadow-lg rounded-xl animate-fade-in">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <GitMerge className="h-6 w-6 text-indigo-600" />
                    <div>
                      <CardTitle className="text-xl font-semibold text-gray-800">
                        Reconciliation Batch
                        <Badge className={`ml-2 ${batchDetails.status === 'completed' ? 'bg-teal-500' : 'bg-indigo-500'} text-white`}>
                          {batchDetails.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-gray-600">
                        Batch ID: <span className="font-mono text-indigo-600">{batchDetails.batchId}</span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-indigo-600" />
                        <span className="text-sm text-gray-600">Created</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-800">
                        {batchDetails.createdAt.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="h-4 w-4 text-teal-600" />
                        <span className="text-sm text-gray-600">Bank Records</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-800">
                        {batchDetails.bankFile.preview?.totalRecords.toLocaleString() || 'N/A'}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-gray-600">Vendor Records</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-800">
                        {batchDetails.vendorFile.preview?.totalRecords.toLocaleString() || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                      {batchDetails.status === 'failed' ? (
                          <>
                            <AlertCircle className="h-5 w-5 text-rose-600" />
                            <span className="text-sm text-rose-600">{batchDetails.failureReason}</span>
                          </>
                      ) : (
                          <>
                            <CheckCircle className="h-5 w-5 text-teal-600" />
                            <span className="text-sm text-teal-600">Batch created successfully</span>
                          </>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <Button
                          variant="outline"
                          size="lg"
                          onClick={resetAll}
                          className="border-gray-300 hover:bg-gray-100"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        New Batch
                      </Button>
                      <Button
                          size="lg"
                          disabled={batchDetails.status === 'failed'}
                          onClick={() => navigate(`/reconciliation/results/${batchDetails.batchId}`)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Results
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
          )}
        </div>

        <style jsx>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fade-in 0.5s ease-out;
          }
        `}</style>
      </div>
  );
};

export default ReconciliationUpload;