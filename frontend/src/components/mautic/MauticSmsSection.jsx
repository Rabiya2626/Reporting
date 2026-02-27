import { useState, useEffect } from "react";
import { MessageSquare, ArrowLeft, Activity, TrendingUp, CheckCircle, XCircle, Eye, Clock, User, MessageCircle } from "lucide-react";
import axios from "axios";

const MauticSmsSection = ({ selectedClient, goBackToServices, goBackToClients }) => {
    const [view, setView] = useState('list'); // 'list', 'messages', or 'activity'
    const [smsCampaigns, setSmsCampaigns] = useState([]);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [messages, setMessages] = useState([]);
    const [selectedLead, setSelectedLead] = useState(null);
    const [leadActivity, setLeadActivity] = useState([]);
    // const [selectedContactInfo, setSelectedContactInfo] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [pageInput, setPageInput] = useState('1');
    const [itemsPerPage, setItemsPerPage] = useState(100);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [overallDelivered, setOverallDelivered] = useState(0);
    const [overallFailed, setOverallFailed] = useState(0);
    const [overallReplied, setOverallReplied] = useState(0);
    const [replyFilter, setReplyFilter] = useState('all'); // 'all', 'Stop', 'Unsubscribe', 'Other'
    const [isSyncing, setIsSyncing] = useState(false); // Track if data is being synced
    const [clientSyncing, setClientSyncing] = useState(false); // Track if any campaign for this client is syncing

    // For SMS-only clients, back button should go to clients list to avoid redirect loop
    const isSmsOnlyClient = selectedClient?.reportId === 'sms-only';
    const handleBack = isSmsOnlyClient ? goBackToClients : goBackToServices;
    const backButtonText = isSmsOnlyClient ? 'Back to Clients' : `Back to ${selectedClient?.name} Services`;

    const openCampaignMessages = async (campaign, page = 1, filter = 'all') => {
        try {
            setLoading(true);
            const baseUrl = import.meta.env.VITE_API_URL || '';
            const response = await axios.get(
                `${baseUrl}/api/mautic/sms-campaigns/${campaign.mauticId}/messages`,
                {
                    params: {
                        page,
                        limit: itemsPerPage,
                        replyFilter: filter !== 'all' ? filter : undefined
                    }
                }
            );
            console.log(response.data);

            // Update all state after data is loaded
            setSelectedCampaign(campaign);
            setCurrentPage(page);
            setReplyFilter(filter);
            setMessages(response.data.data || []);
            setTotalRecords(response.data.total || response.data.pagination?.total || 0);
            setTotalPages(Math.ceil((response.data.total || 0) / itemsPerPage));

            // Store campaign-level stats (not page-level)
            setOverallDelivered(response.data.delivered || 0);
            setOverallFailed(response.data.failed || campaign.failedCount || 0);
            setOverallReplied(response.data.replied || 0);

            setIsSyncing(response.data.syncing || false); // Track syncing status
            setClientSyncing(response.data.syncing || false); // Also set client syncing
            setError(null);
            // Change view only after all data is ready
            setView('messages');
        } catch (error) {
            console.error('Error fetching messages:', error);
            setError('Failed to fetch messages');
        } finally {
            setLoading(false);
        }
    };

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            openCampaignMessages(selectedCampaign, page, replyFilter);
            setPageInput(page.toString());
        }
    };

    const handlePageInputSubmit = (e) => {
        e.preventDefault();
        const page = parseInt(pageInput);
        if (!isNaN(page)) {
            goToPage(page);
        }
    };

    const handleReplyFilterChange = (newFilter) => {
        setReplyFilter(newFilter);
        setCurrentPage(1);
        setPageInput('1');
        openCampaignMessages(selectedCampaign, 1, newFilter);
    };

    const handleItemsPerPageChange = async (newItemsPerPage) => {
        if (selectedCampaign && view === 'messages') {
            setItemsPerPage(newItemsPerPage);
            setCurrentPage(1);
            setPageInput('1');
            // Immediately fetch with new limit
            try {
                setLoading(true);
                const baseUrl = import.meta.env.VITE_API_URL || '';
                const response = await axios.get(
                    `${baseUrl}/api/mautic/sms-campaigns/${selectedCampaign.mauticId}/messages`,
                    {
                        params: {
                            page: 1,
                            limit: newItemsPerPage,
                            replyFilter: replyFilter !== 'all' ? replyFilter : undefined
                        }
                    }
                );
                setMessages(response.data.data || []);
                setTotalRecords(response.data.total || response.data.pagination?.total || 0);
                setTotalPages(Math.ceil((response.data.total || 0) / newItemsPerPage));

                // Use campaign-level stats (not page-level)
                setOverallDelivered(response.data.delivered || 0);
                setOverallFailed(response.data.failed || selectedCampaign.failedCount || 0);
                setOverallReplied(response.data.replied || 0);

                setIsSyncing(response.data.syncing || false);
                setError(null);
            } catch (error) {
                console.error('Error fetching messages:', error);
                setError('Failed to fetch messages');
            } finally {
                setLoading(false);
            }
        }
    };

    const openLeadActivity = async (leadId) => {
        try {
            setView("activity"); // immediate transition for responsiveness
            setLoading(true);

            const baseUrl = import.meta.env.VITE_API_URL || '';
            const response = await axios.get(
                `${baseUrl}/api/mautic/contact/${leadId}`,
                { params: { smsId: selectedCampaign.mauticId } }
            );

            // Update states once data arrives
            setSelectedLead(leadId);
            setLeadActivity(response.data || []);
            // setSelectedContactInfo(response.data.contact || {});

            setError(null);
        } catch (error) {
            console.error("Error fetching lead activity:", error);
            setError("Failed to fetch lead activity");
        } finally {
            setLoading(false);
        }
    };

    const goBackToCampaigns = () => {
        setView('list');
        setSelectedCampaign(null);
        setMessages([]);
        setCurrentPage(1);
        setPageInput('1');
        setError(null);
    };

    const goBackToMessages = () => {
        setView('messages');
        setSelectedLead(null);
        setLeadActivity([]);
        // setSelectedContactInfo({});
        setError(null);
    };

    useEffect(() => {
        // Use mauticApiId for regular Mautic clients, id for SMS-only clients
        const clientId = selectedClient?.mauticApiId || selectedClient?.id;
        if (!clientId) return;

        const fetchSmsCampaigns = async () => {
            try {
                setLoading(true);
                setError(null);
                const baseUrl = import.meta.env.VITE_API_URL || "";
                const response = await axios.get(`${baseUrl}/api/mautic/clients/${clientId}/sms`);
                setSmsCampaigns(response.data.data || []);
            } catch (err) {
                console.error('Error fetching SMS campaigns:', err);
                setError(err.message || 'Failed to load SMS campaigns');
            } finally {
                setLoading(false);
            }
        };

        fetchSmsCampaigns();
    }, [selectedClient?.mauticApiId, selectedClient?.id]);

    // Auto-refresh when syncing is in progress
    useEffect(() => {
        if (!isSyncing || view !== 'messages' || !selectedCampaign) return;

        const refreshInterval = setInterval(() => {
            // Silently refresh data without showing loading state
            const baseUrl = import.meta.env.VITE_API_URL || '';
            axios.get(
                `${baseUrl}/api/mautic/sms-campaigns/${selectedCampaign.mauticId}/messages`,
                {
                    params: {
                        page: currentPage,
                        limit: itemsPerPage,
                        replyFilter: replyFilter !== 'all' ? replyFilter : undefined
                    }
                }
            ).then(response => {
                setMessages(response.data.data || []);
                setIsSyncing(response.data.syncing || false);
                setClientSyncing(response.data.syncing || false);
                // If syncing is complete, stop auto-refresh
                if (!response.data.syncing) {
                    clearInterval(refreshInterval);
                }
            }).catch(error => {
                console.error('Auto-refresh failed:', error);
            });
        }, 5000); // Refresh every 5 seconds

        return () => clearInterval(refreshInterval);
    }, [isSyncing, view, selectedCampaign, currentPage, itemsPerPage, replyFilter]);

    // Calculate metrics
    const totalCampaigns = smsCampaigns.length;
    const totalSent = smsCampaigns.reduce((sum, sms) => sum + (sms.sentCount || 0), 0);
    const avgSentPerCampaign = totalCampaigns > 0 ? Math.round(totalSent / totalCampaigns) : 0;
    const activeCampaigns = smsCampaigns.filter(sms => (sms.sentCount || 0) > 0).length;

    // VIEW: MESSAGES
    if (view === 'messages') {
        return (
            <div className="h-[calc(100vh-90px)] flex flex-col animate-fade-in">
                <button
                    onClick={goBackToCampaigns}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium">Back to SMS Campaigns</span>
                </button>

                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    {selectedCampaign.name}
                </h2>
                <p className="text-sm text-gray-600 mb-6">Messages for SMS ID #{selectedCampaign.mauticId}</p>

                {/* Syncing Banner */}
                {(isSyncing || clientSyncing) && (
                    <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <div>
                            <p className="text-sm font-medium text-blue-900">
                                {isSyncing ? 'Syncing this campaign...' : 'Syncing other campaigns for this client...'}
                            </p>
                            <p className="text-xs text-blue-700">
                                {isSyncing
                                    ? 'Fetching mobile numbers and message details from Mautic. This page will update automatically.'
                                    : 'Another SMS campaign is being synced. Data will be available shortly.'}
                            </p>
                        </div>
                    </div>
                )}



                {/* Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-600">Total Sent</p>
                                <p className="text-2xl font-bold text-blue-900">{(totalRecords || 0).toLocaleString()}</p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-blue-500 opacity-50" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-green-600">Delivered (Campaign)</p>
                                <p className="text-2xl font-bold text-green-900">{(overallDelivered || 0).toLocaleString()}</p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-purple-600">Replied</p>
                                <p className="text-2xl font-bold text-purple-900">{overallReplied.toLocaleString()}</p>
                            </div>
                            <MessageCircle className="w-8 h-8 text-purple-500 opacity-50" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-red-600">Failed</p>
                                <p className="text-2xl font-bold text-red-900">{overallFailed.toLocaleString()}</p>
                            </div>
                            <XCircle className="w-8 h-8 text-red-500 opacity-50" />
                        </div>
                    </div>
                </div>

                {/* Messages Table */}
                <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center flex-wrap gap-4">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">SMS Messages</h3>
                            <p className="text-sm text-gray-500">
                                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalRecords)} of {totalRecords.toLocaleString()} records
                            </p>
                        </div>

                        <div className="flex items-center gap-4 flex-wrap">
                            {/* Reply Filter */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Reply Filter:</span>
                                <select
                                    value={replyFilter}
                                    onChange={(e) => handleReplyFilterChange(e.target.value)}
                                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                                >
                                    <option value="all">All Messages</option>
                                    <option value="Stop">Stop</option>
                                    <option value="Other">Other Replies</option>
                                </select>
                            </div>

                            {/* Per Page Selector */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Per page:</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                                >
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                    <option value={200}>200</option>
                                </select>
                            </div>

                            {/* Page Jump */}
                            <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Jump to:</span>
                                <input
                                    type="number"
                                    min="1"
                                    max={totalPages}
                                    value={pageInput}
                                    onChange={(e) => setPageInput(e.target.value)}
                                    className="w-20 px-3 py-1 border border-gray-300 rounded-lg text-sm"
                                />
                                <button
                                    type="submit"
                                    className="px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                                >
                                    Go
                                </button>
                            </form>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                            <p className="text-gray-600 text-sm">Loading SMS messages...</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col justify-center items-center h-64">
                            <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
                            <p className="text-gray-600 text-lg font-medium mb-2">No messages found</p>
                            <p className="text-gray-500 text-sm">
                                {replyFilter !== 'all'
                                    ? `No messages with "${replyFilter}" replies found for this campaign.`
                                    : 'No messages found for this campaign.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-auto flex-1">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile Number</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reply Text</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reply Date</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {messages.map((msg, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-medium text-gray-900">{msg.leadId}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {msg.mobile ? (
                                                    <span className="text-sm text-gray-900 font-mono">{msg.mobile}</span>
                                                ) : (
                                                    <span className="text-gray-400 italic text-sm">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 max-w-xs">
                                                {msg.replyText ? (
                                                    <div className="text-sm text-gray-700 truncate" title={msg.replyText}>
                                                        {msg.replyText.length > 20
                                                            ? msg.replyText.substring(0, 20) + '...'
                                                            : msg.replyText}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic text-sm">No reply</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {msg.replyCategory ? (
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${msg.replyCategory === 'Stop' ? 'bg-green-100 text-green-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {msg.replyCategory}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-gray-600">{msg.repliedAt ? new Date(msg.repliedAt).toLocaleString() : '-'}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => openLeadActivity(msg.leadId)}
                                                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-xs font-medium transition-colors"
                                                >
                                                    <Activity className="w-3 h-3" />
                                                    View Activity
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination Controls */}
                    <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                            Previous
                        </button>

                        <span className="text-sm text-gray-700">
                            Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
                        </span>

                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // VIEW 3: LEAD ACTIVITY
    if (view === 'activity') {
        // const smsEvents = leadActivity.filter(e => e.event === 'sms.sent');
        // const repliedEvents = leadActivity.filter(e => e.event === 'sms_reply');
        const message = leadActivity.message;
        const reply = leadActivity.reply;
        const totalMessages = message ? 1 : 0;
        const totalReplies = reply ? 1 : 0;
        const totalEvents = totalMessages + totalReplies;

        return (
            <div className="animate-fade-in">
                <button
                    onClick={goBackToMessages}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium">Back to Messages</span>
                </button>

                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {`Lead Activity - ${leadActivity?.mobile || "ID #" + selectedLead}`}
                    </h2>
                    <p className="text-sm text-gray-600">
                        Campaign: {selectedCampaign.name}
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-purple-600 mb-1">Total Events</p>
                                <p className="text-3xl font-bold text-purple-900">{totalEvents}</p>
                            </div>
                            <Activity className="w-10 h-10 text-purple-500 opacity-50" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-600 mb-1">SMS Events</p>
                                <p className="text-3xl font-bold text-blue-900">{totalMessages}</p>
                            </div>
                            <MessageSquare className="w-10 h-10 text-blue-500 opacity-50" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-green-600 mb-1">Replies</p>
                                <p className="text-3xl font-bold text-green-900">{totalReplies}</p>
                            </div>
                            <MessageCircle className="w-10 h-10 text-green-500 opacity-50" />
                        </div>
                    </div>
                </div>

                {/* Activity Timeline */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="text-lg font-semibold text-gray-900">Activity Timeline</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Showing all {totalEvents} events
                        </p>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : totalEvents === 0 ? (
                        <div className="px-6 py-12 text-center">
                            <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium">No activity found for this lead</p>
                        </div>
                    ) : (
                        <div className="px-6 py-4">
                            <div className="space-y-4">
                                {totalMessages > 0 &&
                                    <div className="flex gap-4 p-4 rounded-lg border bg-blue-50 border-blue-200">
                                        <div className="flex-shrink-0">
                                            <MessageSquare className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">
                                                SMS Sent
                                            </p>
                                            <pre className="mt-2 text-xs text-gray-600 bg-white rounded p-2 border border-gray-200 whitespace-pre-wrap break-words">
                                                {JSON.stringify(message, null, 2)}
                                            </pre>
                                            {/* <div className="text-xs text-gray-500 mt-2">
                                                <Clock className="inline w-3 h-3 mr-1" />
                                                {new Date(event.timestamp).toLocaleString()}
                                            </div> */}
                                        </div>
                                    </div>
                                }
                                {totalReplies > 0 &&
                                    <div className="flex gap-4 p-4 rounded-lg border bg-green-50 border-green-200">
                                        <div className="flex-shrink-0">
                                            <MessageCircle className="w-6 h-6 text-green-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">
                                                SMS Reply
                                            </p>
                                            <pre className="mt-2 text-xs text-gray-600 bg-white rounded p-2 border border-gray-200 whitespace-pre-wrap break-words">
                                                {JSON.stringify(reply, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                }
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // VIEW: CAMPAIGN LIST
    if (loading) {
        return (
            <div className="animate-fade-in">
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium">{backButtonText}</span>
                </button>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="animate-fade-in">
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium">{backButtonText}</span>
                </button>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                    <p className="font-medium">Error loading SMS campaigns</p>
                    <p className="text-sm mt-1">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <button
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
            >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">{backButtonText}</span>
            </button>

            <h2 className="text-2xl font-bold text-gray-900 mb-6">
                📱 SMS Campaigns
            </h2>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-blue-600 mb-1">Total Campaigns</p>
                            <p className="text-3xl font-bold text-blue-900">{totalCampaigns}</p>
                        </div>
                        <MessageSquare className="w-10 h-10 text-blue-500 opacity-50" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-green-600 mb-1">Total Sent</p>
                            <p className="text-3xl font-bold text-green-900">{totalSent.toLocaleString()}</p>
                        </div>
                        <TrendingUp className="w-10 h-10 text-green-500 opacity-50" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-purple-600 mb-1">Avg per Campaign</p>
                            <p className="text-3xl font-bold text-purple-900">{avgSentPerCampaign.toLocaleString()}</p>
                        </div>
                        <Activity className="w-10 h-10 text-purple-500 opacity-50" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-amber-600 mb-1">Active Campaigns</p>
                            <p className="text-3xl font-bold text-amber-900">{activeCampaigns}</p>
                        </div>
                        <CheckCircle className="w-10 h-10 text-amber-500 opacity-50" />
                    </div>
                </div>
            </div>

            {/* SMS Campaigns Table */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900">SMS Campaigns</h3>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : smsCampaigns.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">No SMS campaigns found</p>
                        <p className="text-sm text-gray-400 mt-1">Create SMS campaigns in Mautic to see them here</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Category
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Sent
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {smsCampaigns.map((sms) => (
                                    <tr
                                        key={sms.id}
                                        onClick={() => openCampaignMessages(sms)}
                                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <MessageSquare className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0" />
                                                <span className="text-sm font-medium text-gray-900">{sms.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                {sms.category?.title || sms.category?.alias || 'SMS'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-semibold text-gray-900">
                                                {(sms.sentCount || 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {(sms.sentCount || 0) > 0 ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                    <XCircle className="w-3 h-3" />
                                                    Not Sent
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MauticSmsSection;
