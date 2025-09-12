import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Mail } from 'lucide-react';
import Logo from './Logo';

const Footer = () => {
  const navigate = useNavigate();
  
  return (
    <footer className="bg-gray-900 text-white py-20">
      <div className="container-custom">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center space-x-1 mb-6">
              <Logo size="lg" alt="OMW" className="shadow-md" />
            </div>
            <p className="text-gray-400 mb-8">
              Your trusted partner for professional home services.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="bg-gray-800 p-3 rounded-full hover:bg-primary-500 transition-all duration-200 transform hover:scale-110">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" /></svg>
              </a>
              <a href="#" className="bg-gray-800 p-3 rounded-full hover:bg-primary-500 transition-all duration-200 transform hover:scale-110">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg>
              </a>
              <a href="#" className="bg-gray-800 p-3 rounded-full hover:bg-primary-500 transition-all duration-200 transform hover:scale-110">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.623 3.872 10.328 9.092 11.63-.064-.902-.092-2.278.038-3.26.134-.986.9-6.302.9-6.302s-.23-.468-.23-1.148c0-1.076.624-1.88 1.402-1.88.66 0 .98.496.98 1.092 0 .665-.424 1.663-.646 2.588-.182.775.39 1.404 1.15 1.404 1.38 0 2.31-1.457 2.31-3.568 0-1.863-1.334-3.17-3.246-3.17-2.208 0-3.506 1.664-3.506 3.383 0 .67.23 1.388.516 1.78.058.07.082.13.07.2-.076.316-.246.996-.28 1.134-.044.183-.145.222-.335.134-1.25-.58-2.03-2.407-2.03-3.874 0-3.154 2.292-6.052 6.608-6.052 3.469 0 6.165 2.473 6.165 5.776 0 3.447-2.173 6.22-5.19 6.22-1.012 0-1.965-.525-2.29-1.148l-.623 2.378c-.226.87-.834 1.958-1.244 2.62 1.12.345 2.29.535 3.5.535 6.627 0 12-5.373 12-12S18.627 0 12 0z" /></svg>
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Services</h3>
            <ul className="space-y-3">
              <li><a onClick={() => navigate('/category/1/Maintenance')} className="text-gray-400 hover:text-white transition-colors cursor-pointer">Maintenance</a></li>
              <li><a onClick={() => navigate('/category/2/Maid%20Services')} className="text-gray-400 hover:text-white transition-colors cursor-pointer">Maid Services</a></li>
              <li><a onClick={() => navigate('/category/3/Driver%20Services')} className="text-gray-400 hover:text-white transition-colors cursor-pointer">Driver Services</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Company</h3>
            <ul className="space-y-3">
              <li><a onClick={() => navigate('/about-us')} className="text-gray-400 hover:text-white transition-colors cursor-pointer">About Us</a></li>
              <li><a onClick={() => navigate('/careers')} className="text-gray-400 hover:text-white transition-colors cursor-pointer">Careers</a></li>
              <li>
                <button 
                  onClick={() => navigate('/worker/signup')}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  👷 Become a Worker
                </button>
              </li>
              <li><a onClick={() => navigate('/terms')} className="text-gray-400 hover:text-white transition-colors cursor-pointer">Terms & Conditions</a></li>
              <li><a onClick={() => navigate('/privacy')} className="text-gray-400 hover:text-white transition-colors cursor-pointer">Privacy Policy</a></li>
              <li><a onClick={() => navigate('/blog')} className="text-gray-400 hover:text-white transition-colors cursor-pointer">Blog</a></li>
              <li><a onClick={() => navigate('/contact')} className="text-gray-400 hover:text-white transition-colors cursor-pointer">Contact</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Contact</h3>
            <p className="text-gray-400 mb-4">
              123 Street, Toronto, ON, Canada
            </p>
            <p className="text-gray-400 mb-2 flex items-center">
              <Phone className="h-4 w-4 mr-2" /> +1 234-567-8900
            </p>
            <p className="text-gray-400 flex items-center">
              <Mail className="h-4 w-4 mr-2" /> contact@otw.ca
            </p>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} OMW. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 