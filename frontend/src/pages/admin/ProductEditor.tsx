/**
 * Product Editor Page
 * Full-page create/edit for products (/admin/products/new, /admin/products/:id/edit).
 * Replaces the old modal so the long form is usable on small screens; warns
 * before leaving with unsaved changes. If a save only partly worked (photos
 * didn't upload) the form reopens on the saved product.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useBlocker, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { adminAPI } from "../../api";
import ProductForm from "./ProductForm";
import { ConfirmModal, EmptyState, LoadingRegion, Skeleton } from "../../components/ui";
import { usePageTitle } from "../../hooks/usePageTitle";
import { getErrorMessage } from "../../utils/helpers";
import type { ICategory, IProduct } from "../../types";

const ProductEditor = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [product, setProduct] = useState<IProduct | null>(null);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  // Bumped to restart the form on freshly saved data
  const [formKey, setFormKey] = useState(0);
  // Set once saved so the redirect to the list isn't blocked
  const savedRef = useRef(false);

  usePageTitle(isEdit ? (product ? `Edit ${product.name}` : "Edit product") : "New product");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      adminAPI.getCategories(),
      id ? adminAPI.getProductById(id) : Promise.resolve(null),
    ])
      .then(([categoriesRes, productRes]) => {
        if (cancelled) return;
        setCategories(categoriesRes.data.data.categories);
        setProduct(productRes ? productRes.data.data.product : null);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(getErrorMessage(error, "Could not load the product"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // In-app navigation away from unsaved changes asks first…
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !savedRef.current && currentLocation.pathname !== nextLocation.pathname,
  );

  // …and so does closing or reloading the tab
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const backToList = () => navigate("/admin/products");

  const handleSaved = (saved: IProduct, { reopen }: { reopen: boolean }) => {
    savedRef.current = true;
    setDirty(false);
    if (!reopen) {
      backToList();
      return;
    }
    if (isEdit) {
      // Same page: restart the form on the saved product
      setProduct(saved);
      setFormKey((k) => k + 1);
      savedRef.current = false;
    } else {
      navigate(`/admin/products/${saved._id}/edit`, { replace: true });
    }
  };

  const handleDirtyChange = useCallback((value: boolean) => setDirty(value), []);

  if (loadError) {
    return (
      <EmptyState
        type="products"
        title="Couldn't open this product"
        description={loadError}
        actionLabel="Back to products"
        actionLink="/admin/products"
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          <Link
            to="/admin/products"
            className="inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Products
          </Link>
          <h1 className="text-2xl font-bold truncate">
            {isEdit ? product?.name || "Edit product" : "New product"}
          </h1>
        </div>
        {isEdit && product?.slug && (
          <a
            href={`/products/${product.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary text-sm"
          >
            View in store
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
          </a>
        )}
      </div>

      {loading ? (
        <LoadingRegion label="Loading product" className="card p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </LoadingRegion>
      ) : (
        <ProductForm
          key={`${id || "new"}-${formKey}`}
          product={product}
          categories={categories}
          onSaved={handleSaved}
          onCancel={backToList}
          onDirtyChange={handleDirtyChange}
        />
      )}

      <ConfirmModal
        isOpen={blocker.state === "blocked"}
        onClose={() => blocker.reset?.()}
        onConfirm={() => {
          blocker.proceed?.();
          toast("Changes discarded");
        }}
        title="Discard unsaved changes?"
        message="You've made changes to this product that haven't been saved."
        confirmText="Discard changes"
        cancelText="Keep editing"
        variant="warning"
      />
    </div>
  );
};

export default ProductEditor;
