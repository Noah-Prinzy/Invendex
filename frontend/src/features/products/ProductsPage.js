import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adjustProductStockRequest,
  createProductRequest,
  createProductsBulkImportRequest,
  createProductsBulkImportJobRequest,
  getDeletedProductsRequest,
  getProductsBulkImportJobStatusRequest,
  getProductsLowStockSummaryRequest,
  getProductsRequest,
  permanentlyDeleteProductRequest,
  restoreDeletedProductRequest,
  softDeleteProductRequest
} from '../../api/client.js';
import { createIdempotencyKey } from '../../api/idempotency.js';
import Modal from '../../ui/Modal.js';

const ROLES_WITH_LOW_STOCK_ACCESS = new Set([
  'owner',
  'admin',
  'manager',
  'staff'
]);
const ROLES_WITH_PRODUCT_MANAGE = new Set([
  'owner',
  'admin',
  'manager',
  'staff'
]);
const ROLES_WITH_DELETED_REVIEW = new Set(['owner', 'admin']);
const PAGE_SIZE = 8;
const PRODUCTS_QUERY_STALE_TIME_MS = 45 * 1000;
const STOCK_ADJUST_REASONS = [
  'sale',
  'restock',
  'adjustment',
  'return',
  'damaged',
  'expired',
  'stolen',
  'correction',
  'supplier_return'
];
const STOCK_ADJUST_REASON_LABELS = Object.freeze({
  sale: 'sale',
  restock: 'restock',
  adjustment: 'adjustment',
  return: 'return',
  damaged: 'damaged',
  expired: 'expired',
  stolen: 'stolen',
  correction: 'correction',
  supplier_return: 'supplier return'
});
const SENSITIVE_STOCK_ADJUST_REASONS = new Set([
  'damaged',
  'expired',
  'stolen',
  'correction',
  'supplier_return'
]);
const ROLES_WITH_SENSITIVE_ADJUSTMENTS = new Set(['owner', 'admin', 'manager']);
const BULK_PREVIEW_ROW_LIMIT = 5;
const BULK_FIELD_KEYS = [
  'name',
  'sku',
  'skuPrefix',
  'price',
  'category',
  'description',
  'lowStockThreshold',
  'barcode',
  'barcodeType'
];
const BULK_FIELD_LABELS = {
  name: 'Name',
  sku: 'SKU',
  skuPrefix: 'SKU prefix',
  price: 'Price',
  category: 'Category',
  description: 'Description',
  lowStockThreshold: 'Low-stock threshold',
  barcode: 'Barcode',
  barcodeType: 'Barcode type'
};
const BULK_TEMPLATE_HEADERS = [
  'name',
  'sku',
  'skuPrefix',
  'price',
  'category',
  'description',
  'lowStockThreshold',
  'barcode',
  'barcodeType'
];
const BULK_IMPORT_DUPLICATE_POLICIES = [
  { value: 'skip', label: 'Skip duplicates' },
  { value: 'update', label: 'Update existing' },
  { value: 'fail', label: 'Fail duplicate rows' }
];
const BULK_IMPORT_JOB_TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED']);
const BULK_IMPORT_JOB_POLL_INTERVAL_MS = 2000;
const PRODUCT_SAVED_VIEWS_STORAGE_KEY = 'ledgerly.products.savedViews.v1';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(Number(value || 0));

const resolveProductId = (product) =>
  String(product?.id || product?._id || '').trim();

const toUserDateTime = (value) => {
  if (!value) return '-';
  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) return '-';
  return asDate.toLocaleString();
};

const parseCsvMatrix = (inputText) => {
  const text = String(inputText || '');
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
};

const parseCsvToObjects = (csvText) => {
  const matrix = parseCsvMatrix(csvText).filter((row) =>
    row.some((cell) => String(cell || '').trim() !== '')
  );

  if (!matrix.length) {
    throw new Error('CSV is empty.');
  }

  const rawHeaders = matrix[0].map((cell, index) => {
    const normalized = String(cell || '').trim();
    return normalized || `column_${index + 1}`;
  });
  const seenHeaders = new Map();
  const headers = rawHeaders.map((header) => {
    const count = Number(seenHeaders.get(header) || 0) + 1;
    seenHeaders.set(header, count);
    if (count === 1) return header;
    return `${header}_${count}`;
  });

  const rows = matrix.slice(1).map((line) => {
    const rowObject = {};
    headers.forEach((header, index) => {
      rowObject[header] = String(line[index] ?? '').trim();
    });
    return rowObject;
  });

  return { headers, rows };
};

const parseVariantAttributesText = (value) => {
  const input = String(value || '').trim();
  if (!input) return {};

  return input.split(',').reduce((acc, pair) => {
    const [rawKey, rawValue] = String(pair || '').split('=');
    const key = String(rawKey || '').trim();
    const parsedValue = String(rawValue || '').trim();
    if (!key || !parsedValue) return acc;
    acc[key] = parsedValue;
    return acc;
  }, {});
};

const buildDefaultBulkFieldMap = (headers = []) =>
  BULK_FIELD_KEYS.reduce((acc, key) => {
    acc[key] = headers.includes(key) ? key : '';
    return acc;
  }, {});

const sanitizeCsvExportCell = (value) => {
  const normalized = String(value ?? '');
  if (/^[=+\-@]/.test(normalized)) {
    return `'${normalized}`;
  }
  return normalized;
};

const mapScannerFormatToBarcodeType = (scannerFormat) => {
  const normalized = String(scannerFormat || '')
    .trim()
    .toLowerCase();

  if (normalized === 'ean_13') return 'EAN13';
  if (normalized === 'upc_a' || normalized === 'upc_e') return 'UPC';
  if (normalized === 'code_128') return 'CODE128';
  if (normalized === 'qr_code') return 'QR';
  return 'OTHER';
};

const downloadTextFile = ({ filename, content, mimeType }) => {
  const blob = new Blob([String(content || '')], {
    type: mimeType || 'text/plain;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const readSavedProductViews = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PRODUCT_SAVED_VIEWS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((view) => view && typeof view === 'object')
      .map((view) => ({
        id: String(view.id || '').trim(),
        name: String(view.name || '').trim(),
        filters: {
          searchTerm: String(view?.filters?.searchTerm || ''),
          skuFilter: String(view?.filters?.skuFilter || ''),
          stockFilter: String(view?.filters?.stockFilter || 'all'),
          sortKey: String(view?.filters?.sortKey || 'name'),
          sortDirection: String(view?.filters?.sortDirection || 'asc')
        }
      }))
      .filter((view) => view.id && view.name);
  } catch {
    return [];
  }
};

const writeSavedProductViews = (views = []) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      PRODUCT_SAVED_VIEWS_STORAGE_KEY,
      JSON.stringify(Array.isArray(views) ? views : [])
    );
  } catch {
    // Ignore storage errors for non-critical UI preference data.
  }
};

const Products = ({ accessToken, userRole = null, warehouseId = null }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [skuFilter, setSkuFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortKey, setSortKey] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [savedViews, setSavedViews] = useState(() => readSavedProductViews());
  const [savedViewName, setSavedViewName] = useState('');
  const [selectedSavedViewId, setSelectedSavedViewId] = useState('');
  const [page, setPage] = useState(1);
  const [adjustProductId, setAdjustProductId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('adjustment');
  const [adjustNotice, setAdjustNotice] = useState('');
  const [managementNotice, setManagementNotice] = useState('');
  const [bulkImportNotice, setBulkImportNotice] = useState('');
  const [bulkImportHeaders, setBulkImportHeaders] = useState([]);
  const [bulkImportRows, setBulkImportRows] = useState([]);
  const [bulkImportRowErrors, setBulkImportRowErrors] = useState([]);
  const [bulkImportSummary, setBulkImportSummary] = useState(null);
  const [bulkImportJob, setBulkImportJob] = useState(null);
  const [bulkImportOptions, setBulkImportOptions] = useState({
    duplicatePolicy: 'skip',
    atomic: false
  });
  const [bulkImportFieldMap, setBulkImportFieldMap] = useState(
    buildDefaultBulkFieldMap([])
  );
  const [createForm, setCreateForm] = useState({
    name: '',
    sku: '',
    skuPrefix: '',
    isVariant: false,
    parentProduct: '',
    variantAttributesText: '',
    barcode: '',
    barcodeType: '',
    price: '',
    category: '',
    uomBase: 'pcs',
    uomPurchase: 'pcs',
    uomPurchaseToBaseFactor: '1',
    lowStockThreshold: '5',
    description: ''
  });
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
  const [barcodeScannerError, setBarcodeScannerError] = useState('');
  const [barcodeScannerStatus, setBarcodeScannerStatus] = useState('');
  const barcodeVideoRef = useRef(null);
  const barcodeStreamRef = useRef(null);
  const barcodeScanFrameRef = useRef(null);

  const queryClient = useQueryClient();
  const normalizedRole = String(userRole || '')
    .trim()
    .toLowerCase();

  const canReadLowStockSummary =
    ROLES_WITH_LOW_STOCK_ACCESS.has(normalizedRole);
  const canManageProducts = ROLES_WITH_PRODUCT_MANAGE.has(normalizedRole);
  const canReviewDeletedProducts =
    ROLES_WITH_DELETED_REVIEW.has(normalizedRole);
  const canUseSensitiveAdjustmentReasons =
    ROLES_WITH_SENSITIVE_ADJUSTMENTS.has(normalizedRole);
  const availableAdjustReasons = useMemo(() => {
    if (canUseSensitiveAdjustmentReasons) {
      return STOCK_ADJUST_REASONS;
    }
    return STOCK_ADJUST_REASONS.filter(
      (reason) => !SENSITIVE_STOCK_ADJUST_REASONS.has(reason)
    );
  }, [canUseSensitiveAdjustmentReasons]);

  const supportsBarcodeCameraScan = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return (
      'BarcodeDetector' in window &&
      Boolean(navigator?.mediaDevices?.getUserMedia)
    );
  }, []);

  const stopBarcodeScanner = useCallback(() => {
    if (barcodeScanFrameRef.current) {
      window.cancelAnimationFrame(barcodeScanFrameRef.current);
      barcodeScanFrameRef.current = null;
    }
    if (barcodeStreamRef.current) {
      for (const track of barcodeStreamRef.current.getTracks()) {
        track.stop();
      }
      barcodeStreamRef.current = null;
    }
    if (barcodeVideoRef.current) {
      barcodeVideoRef.current.srcObject = null;
    }
  }, []);

  const closeBarcodeScanner = useCallback(() => {
    stopBarcodeScanner();
    setBarcodeScannerOpen(false);
    setBarcodeScannerStatus('');
  }, [stopBarcodeScanner]);

  const productsQueryKey = useMemo(
    () => [
      'products:index',
      String(accessToken || ''),
      String(canReadLowStockSummary),
      String(canReviewDeletedProducts),
      String(searchTerm || ''),
      String(skuFilter || '')
    ],
    [
      accessToken,
      canReadLowStockSummary,
      canReviewDeletedProducts,
      searchTerm,
      skuFilter
    ]
  );

  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: productsQueryKey,
    enabled: Boolean(accessToken),
    staleTime: PRODUCTS_QUERY_STALE_TIME_MS,
    queryFn: async () => {
      const [productsData, lowStockData, deletedProductsData] =
        await Promise.all([
          getProductsRequest(accessToken, {
            q: String(searchTerm || '').trim(),
            sku: String(skuFilter || '').trim()
          }),
          canReadLowStockSummary
            ? getProductsLowStockSummaryRequest(accessToken)
            : Promise.resolve([]),
          canReviewDeletedProducts
            ? getDeletedProductsRequest(accessToken)
            : Promise.resolve([])
        ]);

      return {
        products: Array.isArray(productsData) ? productsData : [],
        lowStockSummary: Array.isArray(lowStockData) ? lowStockData : [],
        deletedProducts: Array.isArray(deletedProductsData)
          ? deletedProductsData
          : []
      };
    }
  });

  const stockAdjustMutation = useMutation({
    mutationFn: async ({
      productId,
      amount,
      reason,
      selectedWarehouseId,
      idempotencyKey
    }) =>
      adjustProductStockRequest({
        accessToken,
        productId,
        amount,
        reason,
        warehouseId: selectedWarehouseId,
        idempotencyKey
      }),
    onSuccess: (result) => {
      if (result?.queued) {
        setAdjustNotice(
          `No network. Adjustment queued for sync (queue size: ${Number(result.queueSize || 0)}).`
        );
        return;
      }

      setAdjustNotice('Stock adjustment saved.');
      setAdjustAmount('');
      queryClient.invalidateQueries({ queryKey: ['products:index'] });
      refetch();
    },
    onError: (mutationError) => {
      setAdjustNotice(
        String(mutationError?.message || 'Unable to adjust stock')
      );
    }
  });

  const createProductMutation = useMutation({
    mutationFn: async (payload) =>
      createProductRequest({
        accessToken,
        ...payload
      }),
    onSuccess: (createdProduct) => {
      const createdSku = String(
        createdProduct?.sku || createdProduct?.data?.sku || ''
      ).trim();
      setManagementNotice(
        createdSku
          ? `Product created successfully. SKU: ${createdSku}`
          : 'Product created successfully.'
      );
      setCreateForm({
        name: '',
        sku: '',
        skuPrefix: '',
        isVariant: false,
        parentProduct: '',
        variantAttributesText: '',
        barcode: '',
        barcodeType: '',
        price: '',
        category: '',
        uomBase: 'pcs',
        uomPurchase: 'pcs',
        uomPurchaseToBaseFactor: '1',
        lowStockThreshold: '5',
        description: ''
      });
      queryClient.invalidateQueries({ queryKey: ['products:index'] });
      refetch();
    },
    onError: (mutationError) => {
      setManagementNotice(
        String(mutationError?.message || 'Unable to create product')
      );
    }
  });

  const bulkImportMutation = useMutation({
    mutationFn: async ({ rows, fieldMap, options }) =>
      createProductsBulkImportRequest({
        accessToken,
        products: rows,
        fieldMap,
        options
      }),
    onSuccess: (result) => {
      const safeResult = result || {};
      const createdCount = Number(result?.createdCount || 0);
      const updatedCount = Number(result?.updatedCount || 0);
      const skippedCount = Number(result?.skippedCount || 0);
      const failedCount = Number(result?.failedCount || 0);
      const dryRun = safeResult?.dryRun === true;
      setBulkImportSummary(safeResult);
      setBulkImportRowErrors(
        Array.isArray(safeResult?.rowErrors) ? safeResult.rowErrors : []
      );
      setBulkImportNotice(
        dryRun
          ? `Validation completed. Valid: ${Number(safeResult?.validRows || 0)}, Invalid: ${Number(safeResult?.invalidRows || 0)}.`
          : `Bulk import completed. Created: ${createdCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}, Failed: ${failedCount}.`
      );

      if (!dryRun) {
        queryClient.invalidateQueries({ queryKey: ['products:index'] });
        refetch();
      }
    },
    onError: (mutationError) => {
      setBulkImportSummary(null);
      setBulkImportRowErrors([]);
      setBulkImportNotice(
        String(mutationError?.message || 'Unable to import CSV')
      );
    }
  });

  const bulkImportJobMutation = useMutation({
    mutationFn: async ({ rows, fieldMap, options }) =>
      createProductsBulkImportJobRequest({
        accessToken,
        products: rows,
        fieldMap,
        options
      }),
    onSuccess: (job) => {
      setBulkImportJob(job || null);
      setBulkImportSummary(null);
      setBulkImportRowErrors([]);
      setBulkImportNotice(
        `Bulk import queued. Job ${String(job?.id || '').slice(-8)} is running in the background.`
      );
    },
    onError: (mutationError) => {
      setBulkImportJob(null);
      setBulkImportSummary(null);
      setBulkImportRowErrors([]);
      setBulkImportNotice(
        String(mutationError?.message || 'Unable to queue bulk import job')
      );
    }
  });

  useEffect(() => {
    const jobId = String(bulkImportJob?.id || '').trim();
    const status = String(bulkImportJob?.status || '')
      .trim()
      .toUpperCase();

    if (
      !accessToken ||
      !jobId ||
      BULK_IMPORT_JOB_TERMINAL_STATUSES.has(status)
    ) {
      return undefined;
    }

    let isCancelled = false;

    const pollJobStatus = async () => {
      try {
        const nextJob = await getProductsBulkImportJobStatusRequest({
          accessToken,
          jobId
        });
        if (isCancelled) return;

        setBulkImportJob(nextJob || null);

        const nextStatus = String(nextJob?.status || '')
          .trim()
          .toUpperCase();
        if (nextStatus === 'RUNNING' || nextStatus === 'QUEUED') {
          const progress = Number(nextJob?.progress?.percent || 0);
          setBulkImportNotice(
            `Bulk import job running... ${Math.max(0, Math.min(100, Math.round(progress)))}%`
          );
          return;
        }

        if (nextStatus === 'COMPLETED') {
          const result = nextJob?.result || null;
          setBulkImportSummary(result);
          setBulkImportRowErrors(
            Array.isArray(result?.rowErrors) ? result.rowErrors : []
          );
          if (result?.dryRun) {
            setBulkImportNotice(
              `Background validation completed. Valid: ${Number(result?.validRows || 0)}, Invalid: ${Number(result?.invalidRows || 0)}.`
            );
          } else {
            setBulkImportNotice(
              `Background import completed. Created: ${Number(result?.createdCount || 0)}, Updated: ${Number(result?.updatedCount || 0)}, Skipped: ${Number(result?.skippedCount || 0)}, Failed: ${Number(result?.failedCount || 0)}.`
            );
            queryClient.invalidateQueries({ queryKey: ['products:index'] });
            refetch();
          }
          return;
        }

        if (nextStatus === 'FAILED') {
          setBulkImportSummary(null);
          setBulkImportRowErrors([]);
          setBulkImportNotice(
            String(nextJob?.error?.message || 'Background import failed')
          );
        }
      } catch (pollError) {
        if (isCancelled) return;
        setBulkImportNotice(
          String(pollError?.message || 'Unable to fetch background job status')
        );
      }
    };

    void pollJobStatus();
    const interval = setInterval(() => {
      void pollJobStatus();
    }, BULK_IMPORT_JOB_POLL_INTERVAL_MS);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [
    accessToken,
    bulkImportJob?.id,
    bulkImportJob?.status,
    queryClient,
    refetch
  ]);

  useEffect(() => {
    writeSavedProductViews(savedViews);
  }, [savedViews]);

  useEffect(() => {
    if (availableAdjustReasons.includes(adjustReason)) {
      return;
    }
    setAdjustReason(availableAdjustReasons[0] || 'adjustment');
  }, [adjustReason, availableAdjustReasons]);

  useEffect(() => {
    if (!barcodeScannerOpen) {
      stopBarcodeScanner();
      return undefined;
    }

    if (!supportsBarcodeCameraScan) {
      setBarcodeScannerError(
        'Camera barcode scan is not supported in this browser. Use manual barcode entry.'
      );
      return undefined;
    }

    let isCancelled = false;
    let detector = null;

    const startScanner = async () => {
      try {
        setBarcodeScannerError('');
        setBarcodeScannerStatus('Starting camera...');

        const scannerWindow = window;
        const BarcodeDetectorCtor = scannerWindow.BarcodeDetector;
        const supportedFormats =
          await BarcodeDetectorCtor.getSupportedFormats();
        const preferredFormats = supportedFormats.filter((format) =>
          ['ean_13', 'upc_a', 'upc_e', 'code_128', 'qr_code'].includes(format)
        );
        detector = new BarcodeDetectorCtor(
          preferredFormats.length ? { formats: preferredFormats } : {}
        );

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' }
          },
          audio: false
        });

        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        barcodeStreamRef.current = stream;

        if (barcodeVideoRef.current) {
          barcodeVideoRef.current.srcObject = stream;
          await barcodeVideoRef.current.play();
        }

        setBarcodeScannerStatus('Point camera at barcode...');

        const scanFrame = async () => {
          if (isCancelled || !barcodeVideoRef.current) return;

          try {
            const detections = await detector.detect(barcodeVideoRef.current);
            if (Array.isArray(detections) && detections.length > 0) {
              const first = detections[0] || null;
              const value = String(first?.rawValue || '').trim();
              if (value) {
                const barcodeType = mapScannerFormatToBarcodeType(
                  first?.format || ''
                );
                setCreateForm((current) => ({
                  ...current,
                  barcode: value,
                  barcodeType
                }));
                setManagementNotice(`Barcode scanned: ${value}`);
                closeBarcodeScanner();
                return;
              }
            }
          } catch (scanError) {
            if (!isCancelled) {
              setBarcodeScannerError(
                String(scanError?.message || 'Unable to detect barcode')
              );
            }
          }

          if (!isCancelled) {
            barcodeScanFrameRef.current = window.requestAnimationFrame(() => {
              void scanFrame();
            });
          }
        };

        barcodeScanFrameRef.current = window.requestAnimationFrame(() => {
          void scanFrame();
        });
      } catch (scannerError) {
        if (isCancelled) return;
        setBarcodeScannerError(
          String(
            scannerError?.message ||
              'Unable to access camera for barcode scanning'
          )
        );
      }
    };

    void startScanner();

    return () => {
      isCancelled = true;
      stopBarcodeScanner();
    };
  }, [
    barcodeScannerOpen,
    closeBarcodeScanner,
    stopBarcodeScanner,
    supportsBarcodeCameraScan
  ]);

  const softDeleteProductMutation = useMutation({
    mutationFn: async (productId) =>
      softDeleteProductRequest({
        accessToken,
        productId
      }),
    onSuccess: () => {
      setManagementNotice(
        'Product removed from active list and sent for admin review.'
      );
      queryClient.invalidateQueries({ queryKey: ['products:index'] });
      refetch();
    },
    onError: (mutationError) => {
      setManagementNotice(
        String(mutationError?.message || 'Unable to remove product')
      );
    }
  });

  const restoreProductMutation = useMutation({
    mutationFn: async (productId) =>
      restoreDeletedProductRequest({
        accessToken,
        productId
      }),
    onSuccess: () => {
      setManagementNotice('Deleted product restored to active list.');
      queryClient.invalidateQueries({ queryKey: ['products:index'] });
      refetch();
    },
    onError: (mutationError) => {
      setManagementNotice(
        String(mutationError?.message || 'Unable to restore product')
      );
    }
  });

  const permanentDeleteProductMutation = useMutation({
    mutationFn: async (productId) =>
      permanentlyDeleteProductRequest({
        accessToken,
        productId
      }),
    onSuccess: () => {
      setManagementNotice('Product permanently deleted.');
      queryClient.invalidateQueries({ queryKey: ['products:index'] });
      refetch();
    },
    onError: (mutationError) => {
      setManagementNotice(
        String(mutationError?.message || 'Unable to permanently delete product')
      );
    }
  });

  const products = useMemo(
    () => (Array.isArray(data?.products) ? data.products : []),
    [data]
  );
  const lowStockSummary = useMemo(
    () => (Array.isArray(data?.lowStockSummary) ? data.lowStockSummary : []),
    [data]
  );
  const deletedProducts = useMemo(
    () => (Array.isArray(data?.deletedProducts) ? data.deletedProducts : []),
    [data]
  );
  const errorMessage = String(error?.message || '').trim();
  const canAdjustStock = Boolean(accessToken);
  const normalizedWarehouseId = String(warehouseId || '').trim();
  const bulkImportJobStatus = String(bulkImportJob?.status || '')
    .trim()
    .toUpperCase();
  const isBulkImportJobActive =
    Boolean(bulkImportJob?.id) &&
    !BULK_IMPORT_JOB_TERMINAL_STATUSES.has(bulkImportJobStatus);
  const isBulkImportBusy =
    bulkImportMutation.isPending ||
    bulkImportJobMutation.isPending ||
    isBulkImportJobActive;

  const handleAdjustStockSubmit = async (event) => {
    event.preventDefault();
    setAdjustNotice('');

    const amount = Number(adjustAmount);
    if (!adjustProductId) {
      setAdjustNotice('Select a product before submitting.');
      return;
    }
    if (!Number.isInteger(amount) || amount === 0) {
      setAdjustNotice('Amount must be a non-zero integer.');
      return;
    }
    if (!normalizedWarehouseId) {
      setAdjustNotice(
        'Select a warehouse in the header before adjusting stock.'
      );
      return;
    }

    await stockAdjustMutation.mutateAsync({
      productId: adjustProductId,
      amount,
      reason: adjustReason,
      selectedWarehouseId: normalizedWarehouseId,
      idempotencyKey: createIdempotencyKey('manual-stock-adjustment')
    });
  };

  const handleCreateInputChange = (field) => (event) => {
    const value = event.target.value;
    setCreateForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleOpenBarcodeScanner = () => {
    setBarcodeScannerError('');
    setBarcodeScannerStatus('');

    if (!supportsBarcodeCameraScan) {
      setManagementNotice(
        'Barcode camera scan is not supported in this browser. Use manual entry.'
      );
      return;
    }

    setBarcodeScannerOpen(true);
  };

  const handleBulkImportFieldMapChange = (field) => (event) => {
    const value = String(event.target.value || '').trim();
    setBulkImportFieldMap((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleBulkImportOptionChange = (field) => (event) => {
    const value =
      field === 'atomic' ? Boolean(event.target.checked) : event.target.value;
    setBulkImportOptions((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleBulkImportFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBulkImportNotice('');
    setBulkImportRowErrors([]);
    setBulkImportSummary(null);
    setBulkImportJob(null);

    try {
      const csvText = await file.text();
      const { headers, rows } = parseCsvToObjects(csvText);
      if (!rows.length) {
        throw new Error('CSV has headers but no data rows.');
      }

      setBulkImportHeaders(headers);
      setBulkImportRows(rows);
      setBulkImportFieldMap((current) =>
        BULK_FIELD_KEYS.reduce((acc, key) => {
          const preferred = String(current?.[key] || '').trim();
          if (preferred && headers.includes(preferred)) {
            acc[key] = preferred;
            return acc;
          }
          acc[key] = headers.includes(key) ? key : '';
          return acc;
        }, {})
      );

      setBulkImportNotice(
        `Loaded ${rows.length} rows from ${file.name}. Review mapping, then import.`
      );
    } catch (fileError) {
      setBulkImportHeaders([]);
      setBulkImportRows([]);
      setBulkImportFieldMap(buildDefaultBulkFieldMap([]));
      setBulkImportNotice(
        String(fileError?.message || 'Unable to parse CSV file')
      );
      setBulkImportRowErrors([]);
      setBulkImportSummary(null);
    } finally {
      event.target.value = '';
    }
  };

  const buildBulkImportRequestPayload = () => {
    if (!bulkImportRows.length) {
      throw new Error('Upload a CSV file first.');
    }

    const normalizedFieldMap = BULK_FIELD_KEYS.reduce((acc, key) => {
      const mappedHeader = String(bulkImportFieldMap?.[key] || '').trim();
      if (mappedHeader) {
        acc[key] = mappedHeader;
      }
      return acc;
    }, {});

    if (!normalizedFieldMap.name || !normalizedFieldMap.price) {
      throw new Error('Map at least Name and Price columns before importing.');
    }

    return {
      rows: bulkImportRows,
      fieldMap: normalizedFieldMap,
      options: {
        duplicatePolicy: String(bulkImportOptions.duplicatePolicy || 'skip'),
        atomic: Boolean(bulkImportOptions.atomic)
      }
    };
  };

  const submitBulkImport = async ({ validateOnly }) => {
    setBulkImportNotice('');
    setBulkImportRowErrors([]);
    setBulkImportSummary(null);
    setBulkImportJob(null);

    const payload = buildBulkImportRequestPayload();
    await bulkImportMutation.mutateAsync({
      rows: payload.rows,
      fieldMap: payload.fieldMap,
      options: {
        validateOnly: Boolean(validateOnly),
        duplicatePolicy: payload.options.duplicatePolicy,
        atomic: payload.options.atomic
      }
    });
  };

  const handleBulkImportSubmit = async (event) => {
    event.preventDefault();
    await submitBulkImport({ validateOnly: false });
  };

  const handleBulkValidate = async () => {
    await submitBulkImport({ validateOnly: true });
  };

  const handleBulkImportInBackground = async () => {
    setBulkImportNotice('');
    setBulkImportRowErrors([]);
    setBulkImportSummary(null);

    try {
      const payload = buildBulkImportRequestPayload();
      await bulkImportJobMutation.mutateAsync({
        rows: payload.rows,
        fieldMap: payload.fieldMap,
        options: {
          validateOnly: false,
          duplicatePolicy: payload.options.duplicatePolicy,
          atomic: payload.options.atomic
        }
      });
    } catch (error) {
      setBulkImportNotice(String(error?.message || 'Unable to queue import'));
    }
  };

  const handleDownloadBulkImportErrors = () => {
    if (!bulkImportRowErrors.length) return;
    const headers = [
      'rowNumber',
      'field',
      'error',
      'originalValue',
      'suggestedFix'
    ];
    const lines = [headers.join(',')];
    bulkImportRowErrors.forEach((rowError) => {
      const values = [
        rowError?.row,
        rowError?.field,
        rowError?.error,
        rowError?.originalValue,
        rowError?.suggestedFix
      ].map((value) => {
        const safe = sanitizeCsvExportCell(value);
        const asString = String(safe ?? '');
        if (/[",\n]/.test(asString)) {
          return `"${asString.replace(/"/g, '""')}"`;
        }
        return asString;
      });
      lines.push(values.join(','));
    });

    downloadTextFile({
      filename: 'ledgerly-bulk-import-errors.csv',
      content: `${lines.join('\n')}\n`,
      mimeType: 'text/csv;charset=utf-8'
    });
  };

  const handleDownloadBulkTemplate = () => {
    const headerRow = BULK_TEMPLATE_HEADERS.join(',');
    const exampleRow = [
      'Example Product',
      '',
      'ELC',
      '29.99',
      'Electronics',
      'Optional description',
      '5',
      '1234567890123',
      'EAN13'
    ].join(',');

    downloadTextFile({
      filename: 'ledgerly-products-template.csv',
      content: `${headerRow}\n${exampleRow}\n`,
      mimeType: 'text/csv;charset=utf-8'
    });
  };

  const handleSaveCurrentProductView = () => {
    const normalizedName = String(savedViewName || '').trim();
    if (!normalizedName) {
      setManagementNotice('Enter a name before saving a product view.');
      return;
    }

    const viewPayload = {
      id: `view_${Date.now()}`,
      name: normalizedName,
      filters: {
        searchTerm: String(searchTerm || ''),
        skuFilter: String(skuFilter || ''),
        stockFilter: String(stockFilter || 'all'),
        sortKey: String(sortKey || 'name'),
        sortDirection: String(sortDirection || 'asc')
      }
    };

    setSavedViews((current) => {
      const deduped = current.filter(
        (view) =>
          String(view.name || '').toLowerCase() !== normalizedName.toLowerCase()
      );
      return [viewPayload, ...deduped].slice(0, 25);
    });
    setSelectedSavedViewId(viewPayload.id);
    setSavedViewName('');
    setManagementNotice(`Saved product view: ${normalizedName}`);
  };

  const handleApplySavedProductView = (viewId) => {
    const selectedId = String(viewId || '').trim();
    setSelectedSavedViewId(selectedId);
    const selectedView = savedViews.find((view) => view.id === selectedId);
    if (!selectedView) return;

    const filters = selectedView.filters || {};
    setSearchTerm(String(filters.searchTerm || ''));
    setSkuFilter(String(filters.skuFilter || ''));
    setStockFilter(String(filters.stockFilter || 'all'));
    setSortKey(String(filters.sortKey || 'name'));
    setSortDirection(String(filters.sortDirection || 'asc'));
    setPage(1);
    setManagementNotice(`Applied product view: ${selectedView.name}`);
  };

  const handleDeleteSavedProductView = () => {
    const selectedId = String(selectedSavedViewId || '').trim();
    if (!selectedId) return;

    const selectedView = savedViews.find((view) => view.id === selectedId);
    setSavedViews((current) =>
      current.filter((view) => view.id !== selectedId)
    );
    setSelectedSavedViewId('');
    setManagementNotice(
      selectedView
        ? `Deleted product view: ${selectedView.name}`
        : 'Saved product view deleted.'
    );
  };

  const handleCreateProductSubmit = async (event) => {
    event.preventDefault();
    setManagementNotice('');

    const name = String(createForm.name || '').trim();
    const sku = String(createForm.sku || '').trim();
    const skuPrefix = String(createForm.skuPrefix || '').trim();
    const barcode = String(createForm.barcode || '').trim();
    const barcodeType = String(createForm.barcodeType || '').trim();
    const category = String(createForm.category || '').trim();
    const description = String(createForm.description || '').trim();
    const isVariant = createForm.isVariant === true;
    const parentProduct = String(createForm.parentProduct || '').trim();
    const variantAttributes = parseVariantAttributesText(
      createForm.variantAttributesText
    );
    const uomBase = String(createForm.uomBase || '').trim();
    const uomPurchase = String(createForm.uomPurchase || '').trim();
    const uomPurchaseToBaseFactor = Number(
      createForm.uomPurchaseToBaseFactor || 1
    );
    const price = Number(createForm.price);
    const lowStockThreshold = Number(createForm.lowStockThreshold);

    if (!name) {
      setManagementNotice('Name is required.');
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setManagementNotice('Price must be a positive number.');
      return;
    }

    if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
      setManagementNotice(
        'Low stock threshold must be a non-negative integer.'
      );
      return;
    }

    if (isVariant && !parentProduct) {
      setManagementNotice(
        'Parent product is required when variant is enabled.'
      );
      return;
    }

    if (
      !Number.isInteger(uomPurchaseToBaseFactor) ||
      uomPurchaseToBaseFactor < 1
    ) {
      setManagementNotice('UOM conversion factor must be an integer >= 1.');
      return;
    }

    await createProductMutation.mutateAsync({
      name,
      sku,
      skuPrefix,
      barcode,
      barcodeType,
      price,
      category,
      description,
      lowStockThreshold,
      isVariant,
      parentProduct,
      variantAttributes,
      uom: {
        base: uomBase || 'pcs',
        purchase: uomPurchase || uomBase || 'pcs',
        purchaseToBaseFactor: uomPurchaseToBaseFactor
      }
    });
  };

  const handleSoftDeleteProduct = async (productId) => {
    if (!productId) return;

    const confirmed = window.confirm(
      'Remove this product from active list and send it for admin review?'
    );
    if (!confirmed) return;

    setManagementNotice('');
    await softDeleteProductMutation.mutateAsync(productId);
  };

  const handleRestoreProduct = async (productId) => {
    if (!productId) return;

    setManagementNotice('');
    await restoreProductMutation.mutateAsync(productId);
  };

  const handlePermanentDeleteProduct = async (productId) => {
    if (!productId) return;

    const confirmed = window.confirm(
      'Permanently delete this product? This cannot be undone.'
    );
    if (!confirmed) return;

    setManagementNotice('');
    await permanentDeleteProductMutation.mutateAsync(productId);
  };

  const stats = useMemo(() => {
    const total = products.length;
    const lowStockCount = lowStockSummary.length;
    const avgPrice =
      total > 0
        ? products.reduce(
            (sum, product) => sum + Number(product.price || 0),
            0
          ) / total
        : 0;
    const pendingDeletionCount = deletedProducts.length;
    return { total, lowStockCount, avgPrice, pendingDeletionCount };
  }, [products, lowStockSummary, deletedProducts]);

  const lowStockSkus = useMemo(
    () =>
      new Set(
        lowStockSummary.map((item) => String(item.sku || '').toUpperCase())
      ),
    [lowStockSummary]
  );

  const filteredProducts = useMemo(() => {
    const normalizedSearch = String(searchTerm || '')
      .trim()
      .toLowerCase();
    const normalizedSkuFilter = String(skuFilter || '')
      .trim()
      .toLowerCase();

    const withFlags = products.map((product) => {
      const sku = String(product.sku || '').toUpperCase();
      const stock = Number(product.stock || 0);
      const threshold = Number(product.lowStockThreshold || 0);
      return {
        ...product,
        _isLowStock: lowStockSkus.has(sku) || stock <= threshold
      };
    });

    const filtered = withFlags.filter((product) => {
      if (normalizedSearch) {
        const haystack =
          `${product.name || ''} ${product.sku || ''} ${product.category || ''} ${product.barcode || ''}`
            .toLowerCase()
            .trim();
        if (!haystack.includes(normalizedSearch)) return false;
      }
      if (normalizedSkuFilter) {
        const productSku = String(product.sku || '')
          .trim()
          .toLowerCase();
        if (!productSku.includes(normalizedSkuFilter)) return false;
      }

      if (stockFilter === 'low' && !product._isLowStock) return false;
      if (stockFilter === 'healthy' && product._isLowStock) return false;

      return true;
    });

    filtered.sort((a, b) => {
      const direction = sortDirection === 'desc' ? -1 : 1;

      if (sortKey === 'stock') {
        return (Number(a.stock || 0) - Number(b.stock || 0)) * direction;
      }
      if (sortKey === 'price') {
        return (Number(a.price || 0) - Number(b.price || 0)) * direction;
      }
      if (sortKey === 'threshold') {
        return (
          (Number(a.lowStockThreshold || 0) -
            Number(b.lowStockThreshold || 0)) *
          direction
        );
      }

      return (
        String(a[sortKey] || '').localeCompare(
          String(b[sortKey] || ''),
          undefined,
          { sensitivity: 'base' }
        ) * direction
      );
    });

    return filtered;
  }, [
    products,
    lowStockSkus,
    searchTerm,
    skuFilter,
    stockFilter,
    sortKey,
    sortDirection
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PAGE_SIZE)
  );

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, page]);

  return (
    <section className="panel">
      <header className="panel-head panel-head-row">
        <div>
          <h2>Products</h2>
          <p>Live product list with low-stock visibility.</p>
        </div>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => refetch()}
          disabled={isLoading || isFetching}
        >
          {isLoading || isFetching ? 'Loading...' : 'Refresh'}
        </button>
      </header>

      <div className="metric-grid">
        <article className="metric-card metric-card-products-total">
          <p className="metric-label">Total products</p>
          <p className="metric-value">{stats.total}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Low stock SKUs</p>
          <p className="metric-value">{stats.lowStockCount}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Average price</p>
          <p className="metric-value">{formatCurrency(stats.avgPrice)}</p>
        </article>
        {canReviewDeletedProducts ? (
          <article className="metric-card">
            <p className="metric-label">Pending delete review</p>
            <p className="metric-value">{stats.pendingDeletionCount}</p>
          </article>
        ) : null}
      </div>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      {managementNotice ? (
        <p className="section-note">{managementNotice}</p>
      ) : null}

      <article className="data-card">
        <h3>Manual stock adjustment</h3>
        <form className="control-row" onSubmit={handleAdjustStockSubmit}>
          <label className="control-field">
            <span>Product</span>
            <select
              value={adjustProductId}
              onChange={(event) => setAdjustProductId(event.target.value)}
              disabled={!canAdjustStock || isLoading || isFetching}
            >
              <option value="">Select product</option>
              {products.map((product) => {
                const productId = resolveProductId(product);
                return (
                  <option key={productId} value={productId}>
                    {product.name || product.sku || productId}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="control-field">
            <span>Reason</span>
            <select
              value={adjustReason}
              onChange={(event) => setAdjustReason(event.target.value)}
              disabled={!canAdjustStock || stockAdjustMutation.isPending}
            >
              {availableAdjustReasons.map((reason) => (
                <option key={reason} value={reason}>
                  {STOCK_ADJUST_REASON_LABELS[reason] || reason}
                </option>
              ))}
            </select>
          </label>
          <label className="control-field">
            <span>Amount</span>
            <input
              type="number"
              step="1"
              value={adjustAmount}
              onChange={(event) => setAdjustAmount(event.target.value)}
              placeholder="e.g. -3 or 10"
              disabled={!canAdjustStock || stockAdjustMutation.isPending}
            />
          </label>
          <label className="control-field">
            <span>Warehouse scope</span>
            <input
              type="text"
              value={normalizedWarehouseId || 'Not selected'}
              readOnly
            />
          </label>
          <button
            type="submit"
            className="btn-ghost"
            disabled={!canAdjustStock || stockAdjustMutation.isPending}
          >
            {stockAdjustMutation.isPending ? 'Saving...' : 'Adjust stock'}
          </button>
        </form>
        {adjustNotice ? <p className="section-note">{adjustNotice}</p> : null}
      </article>

      {canManageProducts ? (
        <article className="data-card">
          <h3>Add product</h3>
          <form className="control-row" onSubmit={handleCreateProductSubmit}>
            <label className="control-field">
              <span>Name</span>
              <input
                type="text"
                value={createForm.name}
                onChange={handleCreateInputChange('name')}
                placeholder="Product name"
                disabled={createProductMutation.isPending}
              />
            </label>
            <label className="control-field">
              <span>SKU</span>
              <input
                type="text"
                value={createForm.sku}
                onChange={handleCreateInputChange('sku')}
                placeholder="Optional (auto-generated if blank)"
                disabled={createProductMutation.isPending}
              />
            </label>
            <label className="control-field">
              <span>SKU prefix</span>
              <input
                type="text"
                value={createForm.skuPrefix}
                onChange={handleCreateInputChange('skuPrefix')}
                placeholder="Optional e.g. ELC"
                disabled={createProductMutation.isPending}
              />
            </label>
            <label className="control-field">
              <span>Price</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={createForm.price}
                onChange={handleCreateInputChange('price')}
                placeholder="0.00"
                disabled={createProductMutation.isPending}
              />
            </label>
            <label className="control-field">
              <span>Category</span>
              <input
                type="text"
                value={createForm.category}
                onChange={handleCreateInputChange('category')}
                placeholder="Optional"
                disabled={createProductMutation.isPending}
              />
            </label>
            <label className="control-field">
              <span>Is variant</span>
              <input
                type="checkbox"
                checked={createForm.isVariant}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    isVariant: event.target.checked
                  }))
                }
                disabled={createProductMutation.isPending}
              />
            </label>
            <label className="control-field">
              <span>Parent product</span>
              <select
                value={createForm.parentProduct}
                onChange={handleCreateInputChange('parentProduct')}
                disabled={
                  createProductMutation.isPending || !createForm.isVariant
                }
              >
                <option value="">None</option>
                {products.map((product) => {
                  const productId = resolveProductId(product);
                  return (
                    <option
                      key={`parent-product-${productId}`}
                      value={productId}
                    >
                      {product.name || product.sku || productId}
                    </option>
                  );
                })}
              </select>
            </label>
            <label className="control-field">
              <span>Variant attributes</span>
              <input
                type="text"
                value={createForm.variantAttributesText}
                onChange={handleCreateInputChange('variantAttributesText')}
                placeholder="e.g. color=black,size=M"
                disabled={
                  createProductMutation.isPending || !createForm.isVariant
                }
              />
            </label>
            <label className="control-field">
              <span>Barcode</span>
              <input
                type="text"
                value={createForm.barcode}
                onChange={handleCreateInputChange('barcode')}
                placeholder="Optional barcode value"
                disabled={createProductMutation.isPending}
              />
            </label>
            <label className="control-field">
              <span>Camera scan</span>
              <button
                type="button"
                className="btn-ghost"
                onClick={handleOpenBarcodeScanner}
                disabled={createProductMutation.isPending}
              >
                Scan barcode
              </button>
            </label>
            <label className="control-field">
              <span>Barcode type</span>
              <select
                value={createForm.barcodeType}
                onChange={handleCreateInputChange('barcodeType')}
                disabled={createProductMutation.isPending}
              >
                <option value="">None</option>
                <option value="CODE128">CODE128</option>
                <option value="EAN13">EAN13</option>
                <option value="UPC">UPC</option>
                <option value="QR">QR</option>
                <option value="OTHER">OTHER</option>
              </select>
            </label>
            <label className="control-field">
              <span>Base UOM</span>
              <input
                type="text"
                value={createForm.uomBase}
                onChange={handleCreateInputChange('uomBase')}
                placeholder="pcs"
                disabled={createProductMutation.isPending}
              />
            </label>
            <label className="control-field">
              <span>Purchase UOM</span>
              <input
                type="text"
                value={createForm.uomPurchase}
                onChange={handleCreateInputChange('uomPurchase')}
                placeholder="box"
                disabled={createProductMutation.isPending}
              />
            </label>
            <label className="control-field">
              <span>Purchase to base factor</span>
              <input
                type="number"
                min="1"
                step="1"
                value={createForm.uomPurchaseToBaseFactor}
                onChange={handleCreateInputChange('uomPurchaseToBaseFactor')}
                placeholder="1"
                disabled={createProductMutation.isPending}
              />
            </label>
            <label className="control-field">
              <span>Low-stock threshold</span>
              <input
                type="number"
                min="0"
                step="1"
                value={createForm.lowStockThreshold}
                onChange={handleCreateInputChange('lowStockThreshold')}
                placeholder="5"
                disabled={createProductMutation.isPending}
              />
            </label>
            <label className="control-field">
              <span>Description</span>
              <input
                type="text"
                value={createForm.description}
                onChange={handleCreateInputChange('description')}
                placeholder="Optional description"
                disabled={createProductMutation.isPending}
              />
            </label>
            <button
              type="submit"
              className="btn-ghost"
              disabled={createProductMutation.isPending}
            >
              {createProductMutation.isPending ? 'Saving...' : 'Add product'}
            </button>
          </form>
          <Modal
            isOpen={barcodeScannerOpen}
            title="Scan barcode"
            onClose={closeBarcodeScanner}
          >
            <div className="panel-head-row">
              <h3>Scan barcode</h3>
              <button
                type="button"
                className="btn-ghost"
                onClick={closeBarcodeScanner}
              >
                Close
              </button>
            </div>
            <p className="event-sub">
              {barcodeScannerStatus || 'Align the barcode inside the frame.'}
            </p>
            <video
              ref={barcodeVideoRef}
              className="scanner-video"
              autoPlay
              muted
              playsInline
            />
            {barcodeScannerError ? (
              <p className="form-error">{barcodeScannerError}</p>
            ) : null}
          </Modal>
        </article>
      ) : null}

      {canManageProducts ? (
        <article className="data-card">
          <h3>Bulk import (CSV)</h3>
          <p className="muted">
            Upload a CSV file, map the columns, then import products in one run.
          </p>
          <div className="pagination-row compact">
            <p className="muted">
              Use the template to get the expected column headers.
            </p>
            <button
              type="button"
              className="btn-ghost"
              onClick={handleDownloadBulkTemplate}
            >
              Download CSV template
            </button>
          </div>
          <form className="control-row" onSubmit={handleBulkImportSubmit}>
            <label className="control-field">
              <span>CSV file</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleBulkImportFileChange}
                disabled={isBulkImportBusy}
              />
            </label>
            <label className="control-field">
              <span>Duplicate handling</span>
              <select
                value={bulkImportOptions.duplicatePolicy}
                onChange={handleBulkImportOptionChange('duplicatePolicy')}
                disabled={isBulkImportBusy}
              >
                {BULK_IMPORT_DUPLICATE_POLICIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="control-field">
              <span>Atomic mode</span>
              <input
                type="checkbox"
                checked={bulkImportOptions.atomic}
                onChange={handleBulkImportOptionChange('atomic')}
                disabled={isBulkImportBusy}
              />
            </label>
            <button
              type="button"
              className="btn-ghost"
              onClick={handleBulkValidate}
              disabled={isBulkImportBusy || !bulkImportRows.length}
            >
              {bulkImportMutation.isPending ? 'Validating...' : 'Validate CSV'}
            </button>
            <button
              type="submit"
              className="btn-ghost"
              disabled={isBulkImportBusy || !bulkImportRows.length}
            >
              {bulkImportMutation.isPending ? 'Importing...' : 'Import CSV'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={handleBulkImportInBackground}
              disabled={isBulkImportBusy || !bulkImportRows.length}
            >
              {bulkImportJobMutation.isPending
                ? 'Queuing...'
                : isBulkImportJobActive
                  ? 'Background job running...'
                  : 'Run in background'}
            </button>
          </form>

          {bulkImportNotice ? (
            <p className="section-note">{bulkImportNotice}</p>
          ) : null}
          {bulkImportJob?.id ? (
            <p className="muted">
              Job ID: {bulkImportJob.id} | Status: {bulkImportJob.status} |
              Progress:{' '}
              {Math.round(Number(bulkImportJob?.progress?.percent || 0))}%
            </p>
          ) : null}
          {bulkImportSummary ? (
            <div className="metric-grid">
              <article className="metric-card">
                <p className="metric-label">Rows</p>
                <p className="metric-value">
                  {Number(bulkImportSummary.totalRows || 0)}
                </p>
              </article>
              <article className="metric-card">
                <p className="metric-label">Valid</p>
                <p className="metric-value">
                  {Number(bulkImportSummary.validRows || 0)}
                </p>
              </article>
              <article className="metric-card">
                <p className="metric-label">Invalid</p>
                <p className="metric-value">
                  {Number(bulkImportSummary.invalidRows || 0)}
                </p>
              </article>
              <article className="metric-card">
                <p className="metric-label">Created/Updated</p>
                <p className="metric-value">
                  {Number(bulkImportSummary.createdCount || 0)} /{' '}
                  {Number(bulkImportSummary.updatedCount || 0)}
                </p>
              </article>
            </div>
          ) : null}

          {bulkImportRowErrors.length ? (
            <div className="pagination-row compact">
              <p className="form-error">
                {bulkImportRowErrors.length} row error(s) detected.
              </p>
              <button
                type="button"
                className="btn-ghost"
                onClick={handleDownloadBulkImportErrors}
              >
                Download errors.csv
              </button>
            </div>
          ) : null}

          {bulkImportHeaders.length ? (
            <>
              <div className="control-row">
                {BULK_FIELD_KEYS.map((field) => (
                  <label className="control-field" key={field}>
                    <span>{BULK_FIELD_LABELS[field]}</span>
                    <select
                      value={bulkImportFieldMap[field] || ''}
                      onChange={handleBulkImportFieldMapChange(field)}
                      disabled={isBulkImportBusy}
                    >
                      <option value="">Skip</option>
                      {bulkImportHeaders.map((header) => (
                        <option key={`${field}-${header}`} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      {bulkImportHeaders.map((header) => (
                        <th key={`preview-head-${header}`}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bulkImportRows
                      .slice(0, BULK_PREVIEW_ROW_LIMIT)
                      .map((row, index) => (
                        <tr key={`preview-row-${index + 1}`}>
                          {bulkImportHeaders.map((header) => (
                            <td key={`preview-cell-${index + 1}-${header}`}>
                              {row[header] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <p className="muted">
                Previewing{' '}
                {Math.min(bulkImportRows.length, BULK_PREVIEW_ROW_LIMIT)} of{' '}
                {bulkImportRows.length} rows.
              </p>
            </>
          ) : null}
        </article>
      ) : null}

      <article className="data-card">
        <h3>Catalog</h3>
        <div className="control-row">
          <label className="control-field">
            <span>Search</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
              placeholder="Name, SKU, category, barcode"
            />
          </label>
          <label className="control-field">
            <span>SKU filter</span>
            <input
              type="text"
              value={skuFilter}
              onChange={(event) => {
                setSkuFilter(event.target.value);
                setPage(1);
              }}
              placeholder="Exact or partial SKU"
            />
          </label>
          <label className="control-field">
            <span>Stock</span>
            <select
              value={stockFilter}
              onChange={(event) => {
                setStockFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All</option>
              <option value="low">Low stock</option>
              <option value="healthy">Healthy</option>
            </select>
          </label>
          <label className="control-field">
            <span>Sort</span>
            <select
              value={sortKey}
              onChange={(event) => {
                setSortKey(event.target.value);
                setPage(1);
              }}
            >
              <option value="name">Name</option>
              <option value="sku">SKU</option>
              <option value="category">Category</option>
              <option value="stock">Stock</option>
              <option value="threshold">Threshold</option>
              <option value="price">Price</option>
            </select>
          </label>
          <label className="control-field">
            <span>Direction</span>
            <select
              value={sortDirection}
              onChange={(event) => {
                setSortDirection(event.target.value);
                setPage(1);
              }}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </label>
        </div>

        <div className="control-row compact">
          <label className="control-field">
            <span>Save current view</span>
            <input
              type="text"
              value={savedViewName}
              onChange={(event) => setSavedViewName(event.target.value)}
              placeholder="e.g. Low stock electronics"
            />
          </label>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleSaveCurrentProductView}
          >
            Save view
          </button>
          <label className="control-field">
            <span>Saved views</span>
            <select
              value={selectedSavedViewId}
              onChange={(event) =>
                handleApplySavedProductView(event.target.value)
              }
            >
              <option value="">Select a saved view</option>
              {savedViews.map((view) => (
                <option key={view.id} value={view.id}>
                  {view.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleDeleteSavedProductView}
            disabled={!selectedSavedViewId}
          >
            Delete view
          </button>
        </div>

        {filteredProducts.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Barcode</th>
                  <th>Category</th>
                  <th>Variant</th>
                  <th>UOM</th>
                  <th>Stock</th>
                  <th>Threshold</th>
                  <th>Price</th>
                  {canManageProducts ? <th>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((product) => {
                  const productId = resolveProductId(product);
                  return (
                    <tr key={productId}>
                      <td>{product.name || '-'}</td>
                      <td>{product.sku || '-'}</td>
                      <td>{product.barcode || '-'}</td>
                      <td>{product.category || '-'}</td>
                      <td>{product.isVariant ? 'Yes' : 'No'}</td>
                      <td>
                        {String(product?.uom?.purchase || 'pcs')}:{' '}
                        {Number(product?.uom?.purchaseToBaseFactor || 1)}{' '}
                        {String(product?.uom?.base || 'pcs')}
                      </td>
                      <td>{Number(product.stock || 0)}</td>
                      <td>{Number(product.lowStockThreshold || 0)}</td>
                      <td>{formatCurrency(product.price)}</td>
                      {canManageProducts ? (
                        <td>
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => handleSoftDeleteProduct(productId)}
                            disabled={softDeleteProductMutation.isPending}
                          >
                            Remove
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No products match your filter.</p>
        )}

        <footer className="pagination-row">
          <p className="muted">
            Showing {paginatedProducts.length} of {filteredProducts.length}{' '}
            filtered products ({products.length} total)
          </p>
          <div className="pagination-controls">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
            >
              Prev
            </button>
            <span className="pagination-text">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              className="btn-ghost"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </footer>
      </article>

      {canReviewDeletedProducts ? (
        <article className="data-card">
          <h3>Deleted items (admin review)</h3>
          {deletedProducts.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Deleted by role</th>
                    <th>Deleted at</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deletedProducts.map((product) => {
                    const productId = resolveProductId(product);
                    return (
                      <tr key={productId}>
                        <td>{product.name || '-'}</td>
                        <td>{product.sku || '-'}</td>
                        <td>{product.category || '-'}</td>
                        <td>{String(product.deletedByRole || '-')}</td>
                        <td>{toUserDateTime(product.deletedAt)}</td>
                        <td>
                          <div className="action-row">
                            <button
                              type="button"
                              className="btn-ghost"
                              onClick={() => handleRestoreProduct(productId)}
                              disabled={restoreProductMutation.isPending}
                            >
                              Restore
                            </button>
                            <button
                              type="button"
                              className="btn-ghost"
                              onClick={() =>
                                handlePermanentDeleteProduct(productId)
                              }
                              disabled={
                                permanentDeleteProductMutation.isPending
                              }
                            >
                              Delete permanently
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">No deleted products waiting for review.</p>
          )}
        </article>
      ) : null}
    </section>
  );
};

export default Products;
