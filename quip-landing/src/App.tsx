import Nav from "./components/Nav";
import Hero from "./components/Hero";
import Showcase from "./components/Showcase";
import Why from "./components/Why";
import Features from "./components/Features";
import Install from "./components/Install";
import Footer from "./components/Footer";

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main>
        <Hero />
        <Showcase />
        <Why />
        <Features />
        <Install />
      </main>
      <Footer />
    </div>
  );
}
