/**
 * Contact Page
 * Contact form (stored by the API and emailed to the store) plus the
 * store's direct contact details.
 */
import { useState, ChangeEvent, FormEvent } from 'react';
import { MapPin, Mail, Phone, Send, Loader2, MessageCircle, CheckCircle2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { contactAPI } from '../api/contact';
import { CONTACT } from '../config/store';
import { usePageTitle } from '../hooks/usePageTitle';
import { getErrorMessage } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';

type Field = 'name' | 'email' | 'phone' | 'subject' | 'message';
type FormErrors = Partial<Record<Field, string>>;

// Same rules as contactValidator in backend/middleware/validate.ts
const validate = (data: Record<Field, string>): FormErrors => {
    const errors: FormErrors = {};
    if (!data.name.trim()) errors.name = 'Please tell us your name';
    if (!/^\S+@\S+\.\S+$/.test(data.email.trim())) errors.email = 'Please enter a valid email address';
    if (data.phone.trim() && !/^(\+?977)?[0-9]{7,10}$/.test(data.phone.replace(/[\s-]/g, ''))) {
        errors.phone = 'Please enter a valid phone number, e.g. 98XXXXXXXX';
    }
    const length = data.message.trim().length;
    if (length < 10) errors.message = 'Please write at least 10 characters';
    else if (length > 2000) errors.message = 'Please keep your message under 2000 characters';
    return errors;
};

const Contact = () => {
    usePageTitle('Contact us', 'Questions about sizes, orders or delivery? Message Nevan Handicraft or call us — we usually reply within a few hours.');
    const { user } = useAuth();

    const [formData, setFormData] = useState<Record<Field, string>>({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        subject: '',
        message: '',
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData((prev) => ({ ...prev, [id]: value }));
        if (errors[id as Field]) setErrors((prev) => ({ ...prev, [id]: undefined }));
    };

    const submitHandler = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const found = validate(formData);
        setErrors(found);
        const firstInvalid = (Object.keys(found) as Field[])[0];
        if (firstInvalid) {
            document.getElementById(firstInvalid)?.focus();
            return;
        }

        setLoading(true);
        try {
            const res = await contactAPI.sendMessage({
                name: formData.name.trim(),
                email: formData.email.trim(),
                phone: formData.phone.replace(/[\s-]/g, '') || undefined,
                subject: formData.subject.trim() || undefined,
                message: formData.message.trim(),
            });
            toast.success(res.message || "Thanks! We've received your message.");
            setSent(true);
            setFormData((prev) => ({ ...prev, subject: '', message: '' }));
        } catch (error) {
            toast.error(getErrorMessage(error, "Couldn't send your message. Please try again or chat with us."));
        } finally {
            setLoading(false);
        }
    };

    const fieldProps = (id: Field) => ({
        id,
        value: formData[id],
        onChange: handleChange,
        'aria-invalid': Boolean(errors[id]),
        'aria-describedby': errors[id] ? `${id}-error` : undefined,
        className: `input ${errors[id] ? 'border-[var(--color-error)]' : ''}`,
    });

    const fieldError = (id: Field) =>
        errors[id] ? (
            <p id={`${id}-error`} className="text-sm text-[var(--color-error)]">
                {errors[id]}
            </p>
        ) : null;

    const contactItems = [
        {
            icon: Phone,
            title: 'Call or WhatsApp',
            content: (
                <>
                    <a href={CONTACT.phoneHref} className="hover:text-[var(--color-primary)] transition-colors">
                        {CONTACT.phoneDisplay}
                    </a>
                    <a
                        href={CONTACT.whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-[var(--color-primary)] hover:underline"
                    >
                        Message us on WhatsApp
                    </a>
                </>
            ),
        },
        {
            icon: Mail,
            title: 'Email',
            content: (
                <a href={`mailto:${CONTACT.email}`} className="break-all hover:text-[var(--color-primary)] transition-colors">
                    {CONTACT.email}
                </a>
            ),
        },
        {
            icon: MapPin,
            title: 'Location',
            content: <p>{CONTACT.address}</p>,
        },
        {
            icon: Clock,
            title: 'Reply time',
            content: <p>{CONTACT.replyTime}</p>,
        },
    ];

    return (
        <div className="min-h-screen">
            {/* HEADER */}
            <div className="bg-[var(--color-primary)] text-[var(--color-on-primary)] py-14 md:py-20 mb-10 md:mb-12 text-center">
                <div className="container-app">
                    <h1 className="text-3xl md:text-5xl font-bold mb-3">Get in touch</h1>
                    <p className="text-lg md:text-xl opacity-90">
                        Questions about sizes, orders or delivery? We're happy to help.
                    </p>
                </div>
            </div>

            {/* CONTENT */}
            <div className="container-app mb-20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* CONTACT FORM */}
                    <div className="lg:col-span-7">
                        <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-6 md:p-8">
                            <h2 className="text-2xl font-bold mb-2">Send us a message</h2>
                            <p className="text-sm text-[var(--color-text-muted)] mb-6">
                                For a quicker answer, use the chat button at the bottom of the page.
                            </p>

                            {sent && (
                                <div
                                    role="status"
                                    className="mb-6 flex items-start gap-3 rounded-xl border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 p-4 text-sm"
                                >
                                    <CheckCircle2 className="w-5 h-5 shrink-0 text-[var(--color-success)]" aria-hidden="true" />
                                    <p>
                                        Message sent — we'll reply to <strong>{formData.email}</strong>. Need to add something?
                                        Just send another message.
                                    </p>
                                </div>
                            )}

                            <form onSubmit={submitHandler} className="space-y-5" noValidate>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label htmlFor="name" className="text-sm font-medium">
                                            Your name <span aria-hidden="true" className="text-[var(--color-error)]">*</span>
                                        </label>
                                        <input type="text" autoComplete="name" required maxLength={100} {...fieldProps('name')} />
                                        {fieldError('name')}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label htmlFor="email" className="text-sm font-medium">
                                            Email address <span aria-hidden="true" className="text-[var(--color-error)]">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            autoComplete="email"
                                            placeholder="name@example.com"
                                            required
                                            {...fieldProps('email')}
                                        />
                                        {fieldError('email')}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label htmlFor="phone" className="text-sm font-medium">
                                            Phone <span className="font-normal text-[var(--color-text-muted)]">(optional)</span>
                                        </label>
                                        <input
                                            type="tel"
                                            autoComplete="tel"
                                            inputMode="tel"
                                            placeholder="98XXXXXXXX"
                                            {...fieldProps('phone')}
                                        />
                                        {fieldError('phone')}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label htmlFor="subject" className="text-sm font-medium">
                                            Subject <span className="font-normal text-[var(--color-text-muted)]">(optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Size for a 6-month-old"
                                            maxLength={150}
                                            {...fieldProps('subject')}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label htmlFor="message" className="text-sm font-medium">
                                        Message <span aria-hidden="true" className="text-[var(--color-error)]">*</span>
                                    </label>
                                    <textarea
                                        rows={5}
                                        placeholder="How can we help? Include your order number if it's about an order."
                                        required
                                        maxLength={2000}
                                        {...fieldProps('message')}
                                        className={`${fieldProps('message').className} min-h-[150px] resize-y`}
                                    />
                                    <div className="flex justify-between gap-3">
                                        {fieldError('message')}
                                        <span className="ml-auto text-xs text-[var(--color-text-muted)]">
                                            {formData.message.trim().length}/2000
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    aria-busy={loading}
                                    className="btn btn-primary w-full md:w-auto h-12 px-8 text-base"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                                            Sending…
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" aria-hidden="true" />
                                            Send message
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* SIDE INFO & MAP */}
                    <div className="lg:col-span-5">
                        <div className="bg-[var(--color-surface-muted)] rounded-2xl border border-[var(--color-border)] p-6 md:p-8 h-full">
                            <h2 className="text-2xl font-bold mb-6">Contact information</h2>

                            <ul className="space-y-6 mb-8">
                                {contactItems.map((item) => (
                                    <li key={item.title} className="flex items-start gap-4">
                                        <span className="w-11 h-11 bg-[var(--color-primary-soft)] rounded-full flex items-center justify-center shrink-0">
                                            <item.icon className="w-5 h-5 text-[var(--color-primary)]" aria-hidden="true" />
                                        </span>
                                        <div className="min-w-0 text-[var(--color-text-muted)]">
                                            <h3 className="font-semibold text-[var(--color-text)] mb-0.5">{item.title}</h3>
                                            {item.content}
                                        </div>
                                    </li>
                                ))}
                            </ul>

                            <p className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-6">
                                <MessageCircle className="w-4 h-4 text-[var(--color-primary)]" aria-hidden="true" />
                                Live chat is open to everyone — no account needed.
                            </p>

                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-[var(--color-primary)]" aria-hidden="true" />
                                Find us on the map
                            </h3>
                            <div className="w-full aspect-[4/3] rounded-xl overflow-hidden border border-[var(--color-border)]">
                                <iframe
                                    title="Map: Nevan Handicraft, Panauti"
                                    src="https://maps.google.com/maps?q=Taukhal%20Panauti%20Nepal&t=&z=15&ie=UTF8&iwloc=&output=embed"
                                    className="w-full h-full border-0"
                                    allowFullScreen
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                ></iframe>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Contact;
