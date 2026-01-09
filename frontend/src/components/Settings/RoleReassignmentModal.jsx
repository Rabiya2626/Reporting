import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

const RoleReassignmentModal = ({ 
  isOpen, 
  role, 
  affectedUsersCount, 
  availableRoles,
  onConfirm, 
  onCancel, 
  isLoading 
}) => {
  const [selectedRoleId, setSelectedRoleId] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedRoleId) {
      alert("Please select a role to reassign users to");
      return;
    }
    onConfirm(parseInt(selectedRoleId));
  };

  const filteredRoles = availableRoles.filter(r => r.id !== role.id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center gap-3 p-6 border-b border-gray-200">
          <AlertTriangle size={24} className="text-yellow-600" />
          <h3 className="text-lg font-semibold text-gray-900">Reassign Users</h3>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="ml-auto p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              There are <span className="font-semibold text-yellow-900">{affectedUsersCount} user(s)</span> currently assigned to the role{" "}
              <span className="font-semibold text-gray-900">"{role.name}"</span>.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reassign users to <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              disabled={isLoading}
              className="form-input w-full"
            >
              <option value="">-- Select a role --</option>
              {filteredRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-gray-500">
            All users assigned to "{role.name}" will be reassigned to the selected role, and then this role will be deleted.
          </p>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || !selectedRoleId}
            className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isLoading ? "Reassigning..." : "Reassign & Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleReassignmentModal;
