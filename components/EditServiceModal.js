import React, { useState, useEffect, useRef } from "react";

// Basic Close Icon SVG (remains the same)
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

export default function EditServiceModal({ isOpen, onClose, service, onSave }) {
  // State for form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [currentImageUrl, setCurrentImageUrl] = useState(""); // Holds the existing image URL
  const [selectedFile, setSelectedFile] = useState(null); // Holds the File object if user selects a new one
  const [previewUrl, setPreviewUrl] = useState(null); // Holds the local preview URL for the selected file
  const [isSaving, setIsSaving] = useState(false);

  // Ref for the file input to reset it
  const fileInputRef = useRef(null);

  // --- Effects ---

  // Populate modal fields when the service prop changes or modal opens
  useEffect(() => {
    if (isOpen && service) {
      setTitle(service.title || "");
      setDescription(service.description || "");
      setCategory(service.category || "");
      setCurrentImageUrl(service.image || ""); // Store the current image URL
      setSelectedFile(null); // Reset selected file
      setPreviewUrl(null); // Reset preview URL
      // Reset file input visually
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } else if (!isOpen) {
      // Optionally reset fields when modal closes (or keep last state)
      // Resetting state when it becomes visible might be better UI
    }
  }, [service, isOpen]); // Depend on service and isOpen

  // Create/Revoke Preview URL when selectedFile changes
  useEffect(() => {
    let objectUrl = null;
    if (selectedFile) {
      objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
    } else {
      setPreviewUrl(null); // Clear preview if no file is selected
    }

    // Cleanup function to revoke the object URL
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        // console.log("Revoked Object URL:", objectUrl); // For debugging
      }
    };
  }, [selectedFile]); // Only re-run when selectedFile changes

  // --- Handlers ---

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    } else {
      // User cancelled file selection or selected no file
      setSelectedFile(null);
    }
  };

  const handleInternalSave = async (e) => {
    e.preventDefault();
    if (!service?.id) {
      console.error("Cannot save, service ID is missing.");
      return;
    }

    setIsSaving(true);

    const updatedData = {
      title,
      description,
      category,
      ...(selectedFile
        ? { newFile: selectedFile }
        : { image: currentImageUrl }),
    };

    try {
      await onSave(service.id, updatedData);
    } catch (error) {
      console.error("Modal save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Close handler ensures cleanup
  const handleClose = () => {
    // Reset state related to file selection if desired upon close
    // setSelectedFile(null); // Already handled by useEffect[isOpen] generally
    // if (fileInputRef.current) {
    //   fileInputRef.current.value = "";
    // }
    onClose(); // Call the original onClose passed via props
  };

  // --- Render Logic ---

  if (!isOpen) {
    return null;
  }

  // Determine which image source to display
  const displayImageUrl = previewUrl || currentImageUrl; // Prioritize new preview

  return (
    // Modal backdrop and container (mostly unchanged)
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onClick={handleClose} // Use wrapped close handler
    >
      {/* Modal content */}
      <div
        className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl m-4 overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose} // Use wrapped close handler
          disabled={isSaving}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          aria-label="Close modal"
        >
          <CloseIcon />
        </button>

        {/* Modal Header */}
        <h2
          id="modal-title"
          className="text-xl font-semibold text-gray-800 mb-4 pr-8"
        >
          Edit Service:{" "}
          <span className="font-normal break-words">
            {service?.title || "..."}
          </span>
        </h2>

        {/* Modal Form */}
        <form onSubmit={handleInternalSave}>
          <div className="space-y-4">
            {/* Title Field (unchanged) */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 shadow-sm focus:border-rose-500 focus:ring-rose-500 disabled:bg-gray-100"
                required
                disabled={isSaving}
              />
            </div>

            {/* Description Field (unchanged) */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 shadow-sm focus:border-rose-500 focus:ring-rose-500 disabled:bg-gray-100"
                disabled={isSaving}
              />
            </div>

            {/* Category Field (unchanged) */}
            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Category <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., halls, catering, travel"
                className="w-full rounded border border-gray-300 px-3 py-2 shadow-sm focus:border-rose-500 focus:ring-rose-500 disabled:bg-gray-100"
                required
                disabled={isSaving}
              />
            </div>

            {/* Image Upload Field */}
            <div>
              <label
                htmlFor="imageFile"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {selectedFile ? "Change Image" : "Upload Image"}
                <span className="text-xs text-gray-500 ml-1">(Optional)</span>
              </label>
              <input
                type="file"
                id="imageFile"
                ref={fileInputRef} // Add ref here
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/gif, image/webp" // Specify acceptable image types
                className="block w-full text-sm text-gray-500 border border-gray-300 rounded cursor-pointer
                           file:mr-4 file:py-2 file:px-4
                           file:rounded file:border-0
                           file:text-sm file:font-semibold
                           file:bg-rose-50 file:text-rose-700
                           hover:file:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSaving}
              />
              {selectedFile && (
                <p className="text-xs text-gray-600 mt-1">
                  Selected: {selectedFile.name}
                </p>
              )}

              {/* --- Image Preview --- */}
              {displayImageUrl && (
                <div className="mt-3">
                  <p className="text-xs text-gray-600 mb-1">
                    {previewUrl ? "New Image Preview:" : "Current Image:"}
                  </p>
                  <img
                    src={displayImageUrl}
                    alt={
                      previewUrl ? "New image preview" : "Current service image"
                    }
                    className="h-24 w-auto rounded object-contain border border-gray-200 bg-gray-50"
                    // Basic error handling for preview
                    onError={(e) => {
                      e.target.style.display = "none"; // Hide broken image icon
                      // Optionally show a placeholder or error message
                    }}
                  />
                </div>
              )}
              {/* --- End Image Preview --- */}
            </div>
          </div>

          {/* Modal Footer/Actions (mostly unchanged) */}
          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-2 space-y-reverse sm:space-y-0">
            <button
              type="button"
              onClick={handleClose} // Use wrapped close handler
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
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
