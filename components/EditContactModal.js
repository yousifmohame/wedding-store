// src/components/EditContactModal.js
import React, { useState, useEffect } from "react";

// Basic Close Icon SVG (reuse or import)
const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

export default function EditContactModal({
  isOpen,
  onClose,
  initialData,
  onSave,
}) {
  // State for form fields within the modal
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Populate modal fields when the initialData prop changes or modal opens
  useEffect(() => {
    if (initialData) {
      setPhone(initialData.phone || "");
      setEmail(initialData.email || "");
      setLocation(initialData.location || "");
    } else {
      // Reset fields if data is missing
      setPhone("");
      setEmail("");
      setLocation("");
    }
  }, [initialData]);

  const handleInternalSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const updatedData = {
      phone,
      email,
      location,
    };

    try {
      // Call the onSave function passed from Footer
      await onSave(updatedData);
      // Success/close handling is done in Footer after Firestore update
    } catch (error) {
      console.error("Modal save delegate error (caught in modal):", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4" // Higher z-index than other potential elements
      aria-labelledby="contact-modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl m-4 overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          aria-label="Close modal"
        >
          <CloseIcon />
        </button>

        {/* Modal Header */}
        <h2
          id="contact-modal-title"
          className="text-lg font-semibold text-gray-800 mb-4 pr-8"
        >
          Edit Contact Information
        </h2>

        {/* Modal Form */}
        <form onSubmit={handleInternalSave}>
          <div className="space-y-4">
            {/* Phone Field */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Phone Number
              </label>
              <input
                type="tel" // Use 'tel' type
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+966 12 345 6789"
                className="w-full rounded border border-gray-300 px-3 py-2 shadow-sm focus:border-rose-500 focus:ring-rose-500 disabled:bg-gray-100"
                disabled={isSaving}
              />
            </div>

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address
              </label>
              <input
                type="email" // Use 'email' type
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@example.com"
                className="w-full rounded border border-gray-300 px-3 py-2 shadow-sm focus:border-rose-500 focus:ring-rose-500 disabled:bg-gray-100"
                disabled={isSaving}
              />
            </div>

            {/* Location Field */}
            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Location Address
              </label>
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
                className="w-full rounded border border-gray-300 px-3 py-2 shadow-sm focus:border-rose-500 focus:ring-rose-500 disabled:bg-gray-100"
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Modal Footer/Actions */}
          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-2 space-y-reverse sm:space-y-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="w-full sm:w-auto justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50 disabled:bg-rose-400"
            >
              {isSaving ? "Saving..." : "Save Contact Info"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
