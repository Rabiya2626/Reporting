import React, { useState, useEffect } from 'react';
import { Activity, AlertCircle, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'react-toastify';
import MetricsCards from './MetricsCards';
import RecordsTable from './RecordsTable';
import ErrorBoundary from './ErrorBoundary';
import { useMetrics, useSyncLogs, useManualFetch } from '../../hooks/dropCowboy/useDropCowboy';
import { extractUniqueClients } from '../../utils/dropCowboy/helpers';

export default function DropCowboyDashboard({ clientCampaigns = null, clientName = null, accessibleClientIds = [] }) {
    const [selectedClient, setSelectedClient] = useState('All');
    const [clientOptions, setClientOptions] = useState(['All']);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [recordsClientFilter, setRecordsClientFilter] = useState('all');
    const [dateFilters, setDateFilters] = useState({ startDate: '', endDate: '' });
    const [recordsMeta, setRecordsMeta] = useState({
        totalRecords: 0,
        currentPage: 1,
        totalPages: 1,
        currentRecordsLength: 0,
        loadingPage: false,
        fetchMessage: ''
    });

    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(t);
    }, [searchTerm]);

    const recordsFilters = React.useMemo(
        () => ({
            searchTerm: debouncedSearch,
            statusFilter,
            clientFilter: recordsClientFilter,
            dateFilters,
            accessibleClientIds,
        }),
        [debouncedSearch, statusFilter, recordsClientFilter, dateFilters, accessibleClientIds]
    );

    const initialFilters = clientCampaigns ? { campaignIds: clientCampaigns } : {};
    const { metrics, loading, error, refetch: refetchMetrics, setFilters: _setFilters } = useMetrics(initialFilters);
    const { syncLogs, refetch: refetchSyncLogs } = useSyncLogs(10);
    const { triggerFetch, isFetching, error: fetchError } = useManualFetch();

    /** 🧠 Filter campaigns and metrics by accessibleClientIds */
    const filteredMetrics = React.useMemo(() => {
        if (!metrics) return null;

        const filteredCampaigns = metrics.campaigns?.filter(c =>
            accessibleClientIds.includes(c.client_id || c.clientId)
        ) || [];

        const clients = extractUniqueClients(filteredCampaigns);
        return {
            ...metrics,
            campaigns: filteredCampaigns,
            clientsData: clients.map(c => ({ id: c.id, name: c.name })),
        };
    }, [metrics, accessibleClientIds]);

    /** 🪄 Set client dropdown options + auto-select if only one assigned */
    useEffect(() => {
        if (filteredMetrics?.campaigns) {
            const clients = extractUniqueClients(filteredMetrics.campaigns);
            setClientOptions(['All', ...clients.map(c => c.name)]);

            // Auto-select the single client if only one is assigned
            if (accessibleClientIds.length === 1 && clients.length === 1) {
                setSelectedClient(clients[0].name);
            } else {
                setSelectedClient('All');
            }
        }
    }, [filteredMetrics, accessibleClientIds]);

    /** 🕒 Auto-refresh metrics & logs every 50 minutes */
    useEffect(() => {
        const interval = setInterval(() => {
            refetchMetrics();
            refetchSyncLogs();
        }, 50 * 60 * 1000);
        return () => clearInterval(interval);
    }, [refetchMetrics, refetchSyncLogs]);

    /** 🔄 Manual SFTP Fetch */
    const handleFetchNow = async () => {
        toast.info('Starting SFTP sync... This may take 30-60 seconds.', { autoClose: 3000 });
        const result = await triggerFetch();

        if (result.success) {
            await refetchMetrics();
            await refetchSyncLogs();
            if (result.data?.warning) toast.warning(result.data.warning);
            else if (result.data?.filesDownloaded > 0)
                toast.success(`Fetched ${result.data.filesDownloaded} files!`);
            else toast.info('Sync completed - no new files.');
        } else {
            toast.error('Failed to fetch: ' + (result.error || 'Unknown error'));
        }
    };

    /** 🧩 Filter campaigns by selected client */
    const filteredCampaigns =
        filteredMetrics?.campaigns?.filter(
            (c) => selectedClient === 'All' || c.client === selectedClient
        ) || [];

    const selectedClientId =
        selectedClient !== 'All'
            ? filteredMetrics?.clientsData?.find((c) => c.name === selectedClient)?.id || null
            : null;

    return (
        <ErrorBoundary>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">Ringless Voicemail Dashboard</h1>

                    {/* Client Dropdown (for multiple clients) */}
                    {clientOptions.length > 2 && (
                        <select
                            value={selectedClient}
                            onChange={(e) => setSelectedClient(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                        >
                            {clientOptions.map((client) => (
                                <option key={client} value={client}>
                                    {client}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {(error || fetchError) && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                        <AlertCircle className="text-red-600 mr-3 flex-shrink-0 mt-0.5" size={18} />
                        <p className="text-sm text-red-800 leading-relaxed">{error || fetchError}</p>
                    </div>
                )}

                {/* Toolbar */}
                <div className="mb-6 flex items-center justify-between gap-4 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        {syncLogs.length > 0 && (
                            <span>
                                Last sync: {format(parseISO(syncLogs[0].timestamp), 'MMM dd, h:mm a')}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={handleFetchNow}
                        disabled={isFetching}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
                    >
                        <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                        {isFetching ? 'Fetching...' : 'Fetch from SFTP'}
                    </button>
                </div>

                {/* Main content */}
                {loading && !metrics ? (
                    <div className="flex items-center justify-center h-96">
                        <div className="text-center">
                            <Activity className="animate-spin mx-auto mb-4 text-blue-600" size={40} />
                            <p className="text-gray-600 text-sm font-medium">Loading dashboard...</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Records Table */}
                        <RecordsTable
                            campaigns={filteredCampaigns}
                            filters={recordsFilters}
                            accessibleClientIds={accessibleClientIds}
                        />
                    </div>
                )}
            </div>
        </ErrorBoundary>
    );
}
