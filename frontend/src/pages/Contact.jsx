/**
 * Contact Page
 * Displays contact form and location info
 * Converted from React Bootstrap to Tailwind CSS
 */
import { useState } from 'react';
import { MapPin, Mail, Phone, Send, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData((prev) => ({ ...prev, [id]: value }));
    };

    const submitHandler = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        toast.success('Thank you for contacting us! We will get back to you soon.');
        setFormData({ name: '', email: '', subject: '', message: '' });
        setLoading(false);
    };

    return (
        <div className="min-h-screen">
            {/* HEADER */}
            <div className="bg-[var(--color-primary)] text-white py-20 mb-12 text-center">
                <div className="container-app">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">Get In Touch</h1>
                    <p className="text-xl text-white/90 font-light">
                        Have questions? We're here to help.
                    </p>
                </div>
            </div>

            {/* CONTENT */}
            <div className="container-app mb-20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* CONTACT FORM */}
                    <div className="lg:col-span-7">
                        <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-8">
                            <h3 className="text-2xl font-bold text-[var(--color-primary)] mb-6">Send Us a Message</h3>

                            <form onSubmit={submitHandler} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label htmlFor="name" className="text-sm font-medium text-[var(--color-text)]">
                                            Your Name
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            placeholder="Enter your name"
                                            required
                                            className="input"
                                            value={formData.name}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="email" className="text-sm font-medium text-[var(--color-text)]">
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            placeholder="name@example.com"
                                            required
                                            className="input"
                                            value={formData.email}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="subject" className="text-sm font-medium text-[var(--color-text)]">
                                        Subject
                                    </label>
                                    <input
                                        type="text"
                                        id="subject"
                                        placeholder="How can we help?"
                                        className="input"
                                        value={formData.subject}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="message" className="text-sm font-medium text-[var(--color-text)]">
                                        Message
                                    </label>
                                    <textarea
                                        id="message"
                                        rows="5"
                                        placeholder="Write your message here..."
                                        required
                                        className="input min-h-[150px] resize-y"
                                        value={formData.message}
                                        onChange={handleChange}
                                    ></textarea>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="btn btn-primary w-full md:w-auto h-12 px-8 text-base shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5 mr-2" />
                                            Send Message
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* SIDE INFO & MAP */}
                    <div className="lg:col-span-5">
                        <div className="bg-gray-50 rounded-2xl shadow-sm border border-[var(--color-border)] p-8 h-full">
                            <h3 className="text-2xl font-bold text-[var(--color-primary)] mb-8">Contact Information</h3>

                            <div className="space-y-8 mb-10">
                                <div className="flex items-start gap-4 group">
                                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                        <MapPin className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-lg mb-1">Our Location</h5>
                                        <p className="text-[var(--color-text-muted)]">Taukhal, Panauti</p>
                                        <p className="text-[var(--color-text-muted)]">Kavrepalanchok, Nepal</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 group">
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                        <Mail className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-lg mb-1">Email Us</h5>
                                        <a href="mailto:anjanastha101@gmail.com" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
                                            anjanastha101@gmail.com
                                        </a>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 group">
                                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                        <Phone className="w-6 h-6 text-yellow-600" />
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-lg mb-1">Call Us</h5>
                                        <a href="tel:+9779844575932" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
                                            +977 9844575932
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-[var(--color-border)] mb-8" />

                            <h5 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-[var(--color-primary)]" />
                                Find Us On Map
                            </h5>
                            <div className="w-full aspect-[4/3] rounded-xl overflow-hidden shadow-inner border border-gray-200">
                                <iframe
                                    title="Panauti Map"
                                    src="https://maps.google.com/maps?q=Taukhal%20Panauti%20Nepal&t=&z=15&ie=UTF8&iwloc=&output=embed"
                                    className="w-full h-full border-0"
                                    allowFullScreen
                                    loading="lazy"
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
