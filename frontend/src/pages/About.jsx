/**
 * About Page
 * Displays brand story, values, and mission
 * Converted from React Bootstrap to Tailwind CSS
 */
import { Link } from 'react-router-dom';
import { Heart, Leaf, Baby, Mail } from 'lucide-react';

const About = () => {
    return (
        <div className="min-h-screen">
            {/* HERO SECTION */}
            <div className="bg-[var(--color-primary)] text-white py-20 mb-16">
                <div className="container-app text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">About Nevan Handicraft</h1>
                    <p className="text-xl md:text-2xl text-white/90 font-light">
                        A mother’s love, stitched into every creation.
                    </p>
                </div>
            </div>

            <div className="container-app">
                {/* STORY SECTION */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24">
                    <div className="relative">
                        <div className="absolute inset-0 bg-[var(--color-primary)] opacity-10 rounded-2xl transform translate-x-4 translate-y-4"></div>
                        <img
                            src="https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800&auto=format&fit=crop&q=60" 
                            alt="Mother and child"
                            className="relative rounded-2xl shadow-lg w-full h-[500px] object-cover"
                        />
                    </div>

                    <div>
                        <h2 className="text-3xl font-bold text-[var(--color-primary)] mb-6">Our Story</h2>

                        <div className="space-y-4 text-lg text-[var(--color-text)]">
                            <p>
                                Nevan Handicraft began with a heartfelt intention — to create
                                meaningful, honest, and handmade pieces that bring warmth into
                                everyday life.
                            </p>

                            <p>
                                During the Covid era, our first brand <span className="font-semibold text-[var(--color-primary)]">Nevan Collection</span> was
                                born, crafting reusable and eco-friendly handmade masks. When life
                                moved forward and motherhood unfolded, a new inspiration bloomed:
                                <span className="font-semibold text-[var(--color-primary)]"> Nevan Sprouts</span>, a baby clothing brand rooted in softness,
                                comfort, and a mother’s touch.
                            </p>

                            <p>
                                Today, both brands grow together under <span className="font-semibold text-[var(--color-primary)]">Nevan Handicraft</span> — a
                                home where creativity, care, and heartfelt crafting become
                                beautiful memories.
                            </p>
                        </div>

                        <Link 
                            to="/" 
                            className="inline-flex items-center justify-center px-8 py-3 mt-8 border-2 border-[var(--color-primary)] text-[var(--color-primary)] font-medium rounded-lg hover:bg-[var(--color-primary)] hover:text-white transition-colors"
                        >
                            Back to Home
                        </Link>
                    </div>
                </div>

                {/* VALUES SECTION */}
                <div className="mb-24">
                    <h2 className="text-3xl font-bold text-center mb-12">What Inspires Us</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Handmade With Love */}
                        <div className="bg-[var(--color-surface)] p-8 rounded-xl shadow-sm border border-[var(--color-border)] text-center hover:shadow-md transition-shadow">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 text-yellow-600 mb-6">
                                <Heart className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold mb-4">Handmade With Love</h3>
                            <p className="text-[var(--color-text-muted)]">
                                Every piece is crafted with warmth, patience, and intention —
                                the kind of care only a mother can give.
                            </p>
                        </div>

                        {/* Eco-Friendly Mindset */}
                        <div className="bg-[var(--color-surface)] p-8 rounded-xl shadow-sm border border-[var(--color-border)] text-center hover:shadow-md transition-shadow">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-6">
                                <Leaf className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold mb-4">Eco-Friendly Mindset</h3>
                            <p className="text-[var(--color-text-muted)]">
                                Slow, ethical, and sustainable crafting using soft, safe,
                                eco-friendly materials for every child.
                            </p>
                        </div>

                        {/* For Moms, By Moms */}
                        <div className="bg-[var(--color-surface)] p-8 rounded-xl shadow-sm border border-[var(--color-border)] text-center hover:shadow-md transition-shadow">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-6">
                                <Baby className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold mb-4">For Moms, By Moms</h3>
                            <p className="text-[var(--color-text-muted)]">
                                We understand comfort, quality and the small details — because
                                we are moms too.
                            </p>
                        </div>
                    </div>
                </div>

                {/* MISSION / VISION / PROMISES */}
                <div className="max-w-6xl mx-auto mb-24 bg-[var(--color-surface)] rounded-2xl p-8 md:p-12 shadow-sm border border-[var(--color-border)]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {/* Mission */}
                        <div>
                            <h3 className="text-2xl font-bold text-[var(--color-primary)] mb-6 flex items-center gap-2">
                                <span className="w-2 h-8 bg-[var(--color-primary)] rounded-full"></span>
                                Mission
                            </h3>
                            <ul className="space-y-3 text-[var(--color-text-muted)] list-disc pl-5">
                                <li>To create honest, comfortable handmade products.</li>
                                <li>To bring joy, safety and warmth to every family.</li>
                                <li>One stitch, one accessory, and one outfit at a time.</li>
                            </ul>
                        </div>

                        {/* Vision */}
                        <div>
                            <h3 className="text-2xl font-bold text-[var(--color-primary)] mb-6 flex items-center gap-2">
                                <span className="w-2 h-8 bg-[var(--color-primary)] rounded-full"></span>
                                Vision
                            </h3>
                            <p className="text-[var(--color-text-muted)] leading-relaxed">
                                To grow Nevan Handicraft into a trusted handmade brand where
                                mothers find comfort, creativity and quality. A place where small,
                                meaningful creations make a big difference in everyday life.
                            </p>
                        </div>

                        {/* Promise */}
                        <div>
                            <h3 className="text-2xl font-bold text-[var(--color-primary)] mb-6 flex items-center gap-2">
                                <span className="w-2 h-8 bg-[var(--color-primary)] rounded-full"></span>
                                Our Promise
                            </h3>
                            <ul className="space-y-3 text-[var(--color-text-muted)] list-disc pl-5">
                                <li>Handmade with care.</li>
                                <li>Soft, safe & baby-friendly fabrics.</li>
                                <li>Eco-friendly and ethical mindset.</li>
                                <li>Slow, thoughtful crafting.</li>
                                <li>Gratitude in every order.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* WHY MOMS TRUST US */}
                <div className="bg-gray-100 rounded-3xl p-12 text-center mb-24 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-[var(--color-primary)] opacity-5 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 right-0 w-48 h-48 bg-[var(--color-accent)] opacity-5 rounded-full translate-x-1/3 translate-y-1/3"></div>
                    
                    <h2 className="text-3xl font-bold mb-6 relative z-10">Why Moms Trust Us</h2>
                    <p className="max-w-3xl mx-auto text-lg text-[var(--color-text-muted)] leading-relaxed relative z-10">
                        Because we are moms too. We understand comfort, softness, quality,
                        and the little things that truly matter. Every product carries a
                        piece of our heart and hard work.
                    </p>
                </div>

                {/* THANK YOU SECTION */}
                <div className="bg-green-50 rounded-3xl p-12 text-center mb-20 border border-green-100">
                    <Heart className="w-12 h-12 text-green-600 mx-auto mb-6" />
                    <h2 className="text-3xl font-bold mb-6 text-gray-900">Thank You</h2>
                    <p className="max-w-2xl mx-auto text-lg text-gray-700 mb-8 leading-relaxed">
                        To every mom, every family and every supporter — thank you for
                        believing in us, choosing handmade, and helping us grow.
                        <br /><br />
                        Nevan Handicraft will always remain what it started as:
                        <br />
                        <span className="font-semibold text-green-800">A mother’s love turned into something beautiful.</span>
                    </p>

                    <Link 
                        to="/contact" 
                        className="inline-flex items-center gap-2 px-8 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                    >
                        <Mail className="w-5 h-5" />
                        Contact Us
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default About;
