import { Users, Mail, List, Send } from 'lucide-react';
import { formatNumber } from '../../utils/mautic';

/**
 * MetricsCards
 *
 * Props:
 * - metrics: { overview?, emailStats? }
 * - accessibleClients: array of client objects the user can access ( [{ id, name }, ...] )
 * - selectedClientId: optional id — when present show only that client's stats
 */
export default function MetricsCards({
  metrics = {},
  accessibleClients = [],
  selectedClientId = null,
}) {
  const { overview = {}, emailStats = {} } = metrics;

  // per-client breakdown from backend, if present
  const clientsData = Array.isArray(overview.clientsData) ? overview.clientsData : [];

  // helper: accessible client ids (numbers)
  const accessibleIds = (accessibleClients || []).map(c => Number(c.id)).filter(Boolean);

  // Decide which client objects we will aggregate/display
  // If backend gives per-client data, prefer that and filter it.
  // Otherwise fall back to accessibleClients (which may not include totals).
  let clientsForAggregation = [];

  if (clientsData.length > 0) {
    if (selectedClientId) {
      clientsForAggregation = clientsData.filter(c => Number(c.id) === Number(selectedClientId));
    } else {
      // only include per-client rows that are in accessible list (if provided)
      if (accessibleIds.length > 0) {
        clientsForAggregation = clientsData.filter(c => accessibleIds.includes(Number(c.id)));
      } else {
        clientsForAggregation = clientsData;
      }
    }
  } else {
    // backend didn't send per-client breakdown — use accessibleClients as placeholders
    if (selectedClientId) {
      clientsForAggregation = (accessibleClients || []).filter(c => Number(c.id) === Number(selectedClientId));
    } else {
      clientsForAggregation = accessibleClients || [];
    }
  }

  // Effective client count to show in subtitles:
  // - If a specific client selected -> 1
  // - else prefer number of accessibleClients (what the user actually sees)
  const effectiveClientCount = selectedClientId
    ? 1
    : (accessibleClients && accessibleClients.length > 0)
      ? accessibleClients.length
      : (clientsForAggregation.length || 0);

  const plural = effectiveClientCount !== 1 ? 's' : '';

  // Compute aggregated totals
  // If clientsForAggregation items actually have numeric totals (totalContacts etc.), sum them.
  // Otherwise fall back to overview totals (which might be global), but still show effective client count in subtitle.
  const hasPerClientTotals = clientsForAggregation.length > 0 && typeof clientsForAggregation[0].totalContacts !== 'undefined';

  let totals = {
    totalContacts: 0,
    totalEmails: 0,
    totalCampaigns: 0,
    totalSegments: 0,
  };

  if (hasPerClientTotals) {
    totals = clientsForAggregation.reduce((acc, c) => ({
      totalContacts: acc.totalContacts + (Number(c.totalContacts) || 0),
      totalEmails: acc.totalEmails + (Number(c.totalEmails) || 0),
      totalCampaigns: acc.totalCampaigns + (Number(c.totalCampaigns) || 0),
      totalSegments: acc.totalSegments + (Number(c.totalSegments) || 0),
    }), totals);
  } else {
    // fallback: use overview totals (if present) — but only for display; subtitle still uses accessible client count
    totals.totalContacts = Number(overview.totalContacts || 0);
    totals.totalEmails = Number(overview.totalEmails || 0);
    totals.totalCampaigns = Number(overview.totalCampaigns || 0);
    totals.totalSegments = Number(overview.totalSegments || 0);

    // Special-case: if there's exactly one accessible client and overview is present, it's ok to show overview as that client's totals
    // (keeps backwards compatibility with your earlier working version).
    if (selectedClientId && accessibleClients.length === 1 && totals.totalContacts === 0) {
      // no per-client totals and overview is zero — keep zeros (no better data available)
    }
  }

  // Email subtitle: if a selected client and per-client email stat available, prefer that.
  let emailsSubtitle = `${formatNumber(emailStats?.totalSent || 0)} sent to contacts`;
  if (selectedClientId && clientsData.length > 0) {
    const clientRow = clientsData.find(c => Number(c.id) === Number(selectedClientId));
    if (clientRow && typeof clientRow.totalEmails !== 'undefined') {
      emailsSubtitle = `${formatNumber(clientRow.totalEmails || 0)} emails for ${clientRow.name || 'selected client'}`;
    } else {
      const clientObj = accessibleClients.find(c => Number(c.id) === Number(selectedClientId));
      emailsSubtitle = clientObj ? `For ${clientObj.name}` : 'For selected client';
    }
  }

  const cards = [
    {
      title: 'Total Contacts',
      value: formatNumber(totals.totalContacts || 0),
      icon: Users,
      color: 'bg-blue-500',
      subtitle: `Across ${effectiveClientCount} client${plural}`,
    },
    {
      title: 'Total Emails',
      value: formatNumber(totals.totalEmails || 0),
      icon: Mail,
      color: 'bg-indigo-500',
      subtitle: emailsSubtitle,
    },
    {
      title: 'Total Campaigns',
      value: formatNumber(totals.totalCampaigns || 0),
      icon: Send,
      color: 'bg-purple-500',
      subtitle: 'Marketing campaigns',
    },
    {
      title: 'Total Segments',
      value: formatNumber(totals.totalSegments || 0),
      icon: List,
      color: 'bg-green-500',
      subtitle: `Across ${effectiveClientCount} client${plural}`,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div key={idx} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-500 mt-2">{card.subtitle}</p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <Icon className="text-white" size={24} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
