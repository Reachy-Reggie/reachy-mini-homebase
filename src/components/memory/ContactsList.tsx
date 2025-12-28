// Contacts List Component
// Displays all contacts with search and allows viewing details

import { useState, useEffect } from 'react';
import { memoryApi } from '../../services/memoryApi';
import { ContactDetail } from './ContactDetail';
import type { Contact } from '../../types/memory';

export function ContactsList() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    loadContacts();
  }, [search, page]);

  const loadContacts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await memoryApi.getContacts({
        search: search || undefined,
        limit: pageSize,
        offset: page * pageSize,
      });
      setContacts(result.contacts);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(0); // Reset to first page on search
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getContactDisplayName = (contact: Contact) => {
    if (contact.name) return contact.name;
    if (contact.phoneNumber) return contact.phoneNumber;
    if (contact.email) return contact.email;
    return contact.id;
  };

  const totalPages = Math.ceil(total / pageSize);

  // If a contact is selected, show the detail view
  if (selectedContactId) {
    return (
      <ContactDetail
        contactId={selectedContactId}
        onBack={() => {
          setSelectedContactId(null);
          loadContacts(); // Refresh list in case contact was updated
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={handleSearchChange}
          placeholder="Search contacts..."
          className="w-full px-4 py-2 pl-10 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-reachy-500 focus:ring-1 focus:ring-reachy-500"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin text-2xl">&#9881;</div>
          <span className="ml-3 text-gray-400">Loading contacts...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && contacts.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {search ? 'No contacts match your search' : 'No contacts yet. Start a conversation!'}
        </div>
      )}

      {/* Contacts Table */}
      {!isLoading && contacts.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
                <th className="pb-2 font-medium">Contact</th>
                <th className="pb-2 font-medium">Last Contact</th>
                <th className="pb-2 font-medium text-right">Messages</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr
                  key={contact.id}
                  onClick={() => setSelectedContactId(contact.id)}
                  className="border-b border-gray-700/50 cursor-pointer hover:bg-gray-700/30 transition-colors"
                >
                  <td className="py-3">
                    <div>
                      <p className="text-white font-medium">
                        {getContactDisplayName(contact)}
                      </p>
                      {contact.relationship && (
                        <p className="text-xs text-gray-500">{contact.relationship}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 text-gray-400">
                    {formatDate(contact.lastContact)}
                  </td>
                  <td className="py-3 text-right text-gray-400">
                    {contact.interactionCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-500">
            Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
