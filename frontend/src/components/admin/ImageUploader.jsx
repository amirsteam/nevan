/**
 * ImageUploader Component
 * Drag-and-drop image upload with preview
 */
import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Star, Loader2 } from 'lucide-react';

const ImageUploader = ({
    images = [],
    onUpload,
    onDelete,
    onSetPrimary,
    multiple = true,
    maxFiles = 10,
    maxSize = 5, // MB
    accept = 'image/jpeg,image/png,image/webp',
    uploading = false,
    showPrimarySelector = true,
}) => {
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState(null);
    const inputRef = useRef(null);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const validateFiles = (files) => {
        setError(null);
        const validFiles = [];

        for (const file of files) {
            // Check file type
            if (!file.type.startsWith('image/')) {
                setError('Only image files are allowed');
                continue;
            }

            // Check file size
            if (file.size > maxSize * 1024 * 1024) {
                setError(`File size must be less than ${maxSize}MB`);
                continue;
            }

            validFiles.push(file);
        }

        // Check max files
        if (images.length + validFiles.length > maxFiles) {
            setError(`Maximum ${maxFiles} images allowed`);
            return validFiles.slice(0, maxFiles - images.length);
        }

        return validFiles;
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const { files } = e.dataTransfer;
        if (files && files.length > 0) {
            const validFiles = validateFiles(Array.from(files));
            if (validFiles.length > 0) {
                onUpload(validFiles);
            }
        }
    };

    const handleChange = (e) => {
        const { files } = e.target;
        if (files && files.length > 0) {
            const validFiles = validateFiles(Array.from(files));
            if (validFiles.length > 0) {
                onUpload(validFiles);
            }
        }
        // Reset input
        e.target.value = '';
    };

    const handleClick = () => {
        inputRef.current?.click();
    };

    return (
        <div className="space-y-4">
            {/* Dropzone */}
            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={handleClick}
                className={`
                    border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                    transition-colors
                    ${dragActive
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                        : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'}
                    ${uploading ? 'pointer-events-none opacity-50' : ''}
                `}
            >
                <input
                    ref={inputRef}
                    type="file"
                    multiple={multiple}
                    accept={accept}
                    onChange={handleChange}
                    className="hidden"
                />

                {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-10 h-10 text-[var(--color-primary)] animate-spin" />
                        <p className="font-medium">Uploading...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <Upload className="w-10 h-10 text-[var(--color-text-muted)]" />
                        <p className="font-medium">Drop images here or click to upload</p>
                        <p className="text-sm text-[var(--color-text-muted)]">
                            JPEG, PNG or WebP (max {maxSize}MB each)
                        </p>
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <p className="text-sm text-[var(--color-error)]">{error}</p>
            )}

            {/* Preview Grid */}
            {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {images.map((image, index) => (
                        <div key={image.id || image._id || index} className="relative group aspect-square">
                            {/* Image */}
                            <img
                                src={image.url || image.preview}
                                alt={image.alt || `Image ${index + 1}`}
                                className="w-full h-full object-cover rounded-lg border border-[var(--color-border)]"
                            />

                            {/* Primary badge */}
                            {image.isPrimary && (
                                <div className="absolute top-2 left-2 bg-[var(--color-accent)] text-white px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1">
                                    <Star className="w-3 h-3" />
                                    Primary
                                </div>
                            )}

                            {/* Actions overlay */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                                {/* Set as primary */}
                                {showPrimarySelector && !image.isPrimary && onSetPrimary && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSetPrimary(image.id || image._id);
                                        }}
                                        className="p-2 bg-white rounded-full hover:bg-gray-100"
                                        title="Set as primary"
                                    >
                                        <Star className="w-4 h-4 text-gray-700" />
                                    </button>
                                )}

                                {/* Delete */}
                                {onDelete && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(image.id || image._id);
                                        }}
                                        className="p-2 bg-white rounded-full hover:bg-gray-100"
                                        title="Delete"
                                    >
                                        <X className="w-4 h-4 text-red-600" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Info */}
            {images.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                    <ImageIcon className="w-4 h-4" />
                    <span>No images uploaded yet</span>
                </div>
            )}
        </div>
    );
};

export default ImageUploader;
