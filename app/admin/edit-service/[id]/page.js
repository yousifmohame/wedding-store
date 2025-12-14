"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";

export default function EditService() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loadingAuth } = useAuth();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "general",
    image: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const storage = getStorage(app);

  useEffect(() => {
    if (!loadingAuth && !["admin", "subadmin"].includes(user?.role)) {
      router.push("/");
    }
  }, [user, loadingAuth, router]);

  useEffect(() => {
    const fetchService = async () => {
      try {
        const db = getFirestore(app);
        const serviceDoc = await getDoc(doc(db, "home", id));

        if (serviceDoc.exists()) {
          setService(serviceDoc.data());
          setFormData({
            title: serviceDoc.data().title || "",
            description: serviceDoc.data().description || "",
            category: serviceDoc.data().category || "general",
            image: serviceDoc.data().image || "",
          });
        }
      } catch (err) {
        console.error("Error fetching service:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchService();
  }, [id]);

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleUploadImage = async () => {
    if (!imageFile) return null;

    setUploadingImage(true);
    try {
      const storageRef = ref(
        storage,
        `services/${Date.now()}-${imageFile.name}`
      );
      await uploadBytes(storageRef, imageFile);
      const downloadURL = await getDownloadURL(storageRef);
      setFormData({ ...formData, image: downloadURL });
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image:", error);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let imageUrl = formData.image;
      if (imageFile) {
        imageUrl = await handleUploadImage();
        if (!imageUrl) {
          console.error("Image upload failed, cannot update service.");
          return;
        }
      }

      const db = getFirestore(app);
      await updateDoc(doc(db, "home", id), { ...formData, image: imageUrl });
      router.push("/");
    } catch (err) {
      console.error("Error updating service:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Service Not Found
          </h2>
          <p className="text-gray-600 mb-4">
            The service you&apos;re trying to edit doesn&apos;t exist or may
            have been removed.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-rose-600 text-white rounded-md hover:bg-rose-700 transition-colors"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Edit Service
          </h1>
          <p className="mt-3 text-xl text-gray-500">
            Update your service details below
          </p>
        </div>

        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 sm:p-8">
            <div className="space-y-6">
              {/* Title Field */}
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700"
                >
                  Title
                </label>
                <div className="mt-1">
                  <input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="block w-full px-4 py-3 rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 border"
                    required
                    placeholder="Service title"
                  />
                </div>
              </div>

              {/* Description Field */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700"
                >
                  Description
                </label>
                <div className="mt-1">
                  <textarea
                    id="description"
                    rows={5}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="block w-full px-4 py-3 rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 border"
                    placeholder="Detailed description of your service"
                  />
                </div>
              </div>

              {/* Category Field */}
              <div>
                <label
                  htmlFor="category"
                  className="block text-sm font-medium text-gray-700"
                >
                  Category
                </label>
                <div className="mt-1">
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="block w-full px-4 py-3 rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 border"
                  >
                    <option value="general">General</option>
                    <option value="halls">Halls</option>
                    <option value="catering">Catering</option>
                    <option value="travel">Travel</option>
                  </select>
                </div>
              </div>

              {/* Image Upload Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Service Image
                </label>
                <div className="mt-1 flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col w-full h-32 border-2 border-dashed rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all">
                        <div className="flex flex-col items-center justify-center pt-7">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-8 h-8 text-gray-400 group-hover:text-gray-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                          <p className="pt-1 text-sm tracking-wider text-gray-400 group-hover:text-gray-600">
                            {imageFile ? imageFile.name : "Select a photo"}
                          </p>
                        </div>
                        <input
                          type="file"
                          onChange={handleImageChange}
                          className="opacity-0"
                          accept="image/*"
                        />
                      </label>
                    </div>
                    {uploadingImage && (
                      <div className="mt-2 text-sm text-rose-600 flex items-center">
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-rose-600"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Uploading...
                      </div>
                    )}
                  </div>

                  {/* Image Preview */}
                  <div className="flex-1 flex justify-center">
                    <div className="relative w-full h-32 rounded-lg overflow-hidden border">
                      {formData.image || imageFile ? (
                        <img
                          src={
                            imageFile
                              ? URL.createObjectURL(imageFile)
                              : formData.image
                          }
                          alt="Service preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                          No image selected
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="px-6 py-3 border border-gray-300 rounded-md text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={isSubmitting || uploadingImage}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Updating...
                  </span>
                ) : (
                  "Update Service"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
