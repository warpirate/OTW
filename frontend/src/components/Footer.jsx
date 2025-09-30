import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Mail, Facebook, Twitter, Instagram, MapPin } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import Logo from './Logo';

const Footer = () => {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  
  // Navigate to landing page and scroll to Our Services
  const goToServices = (tab) => {
    navigate('/', { state: { scrollToServices: true, activeTab: tab } });
  };
  
  // Theme-aware classes computed explicitly to avoid reliance on global `dark` class
  const baseBg = darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900';
  const borderColor = darkMode ? 'border-gray-700' : 'border-gray-200';
  const headingText = darkMode ? 'text-white' : 'text-gray-900';
  const mutedText = darkMode ? 'text-gray-400' : 'text-gray-600';
  const linkText = darkMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-600 hover:text-blue-600';
  const iconBg = darkMode ? 'bg-gray-800' : 'bg-gray-200';
  const iconColor = darkMode ? 'text-gray-400' : 'text-gray-600';
  
  return (
    <footer className={`${baseBg} py-16 border-t ${borderColor} transition-colors duration-200`}>
      <div className="container-custom">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Company Info */}
          <div className="space-y-6">
            <div className="flex items-center space-x-1">
              <Logo responsive alt="OMW" />
            </div>
            <p className={`${mutedText} text-sm leading-relaxed`}>
              Your trusted partner for professional home services. Quality, reliability, and convenience at your doorstep.
            </p>
            <div className="flex space-x-3">
              <a 
                href="#" 
                className={`${iconBg} p-3 rounded-full hover:bg-blue-500 hover:text-white transition-all duration-300 transform hover:scale-110 group`}
                aria-label="Facebook"
              >
                <Facebook className={`h-4 w-4 ${iconColor} group-hover:text-white`} />
              </a>
              <a 
                href="#" 
                className={`${iconBg} p-3 rounded-full hover:bg-blue-400 hover:text-white transition-all duration-300 transform hover:scale-110 group`}
                aria-label="Twitter"
              >
                <Twitter className={`h-4 w-4 ${iconColor} group-hover:text-white`} />
              </a>
              <a 
                href="#" 
                className={`${iconBg} p-3 rounded-full hover:bg-pink-500 hover:text-white transition-all duration-300 transform hover:scale-110 group`}
                aria-label="Instagram"
              >
                <Instagram className={`h-4 w-4 ${iconColor} group-hover:text-white`} />
              </a>
            </div>
          </div>
          
          {/* Services */}
          <div className="space-y-6">
            <h3 className={`text-lg font-semibold ${headingText}`}>Services</h3>
            <ul className="space-y-3">
              <li>
                <a 
                  onClick={() => goToServices('maintenance')} 
                  className={`${linkText} transition-colors cursor-pointer text-sm`}
                >
                  Maintenance
                </a>
              </li>
              <li>
                <a 
                  onClick={() => goToServices('maid')} 
                  className={`${linkText} transition-colors cursor-pointer text-sm`}
                >
                  Maid Services
                </a>
              </li>
              <li>
                <a 
                  onClick={() => goToServices('driver')} 
                  className={`${linkText} transition-colors cursor-pointer text-sm`}
                >
                  Driver Services
                </a>
              </li>
            </ul>
          </div>
          
          {/* Company */}
          <div className="space-y-6">
            <h3 className={`text-lg font-semibold ${headingText}`}>Company</h3>
            <ul className="space-y-3">
              <li>
                <a 
                  onClick={() => navigate('/about-us')} 
                  className={`${linkText} transition-colors cursor-pointer text-sm`}
                >
                  About Us
                </a>
              </li>
              <li>
                <a 
                  onClick={() => navigate('/careers')} 
                  className={`${linkText} transition-colors cursor-pointer text-sm`}
                >
                  Careers
                </a>
              </li>
              <li>
                <button 
                  onClick={() => navigate('/worker/signup')}
                  className={`transition-colors text-sm font-medium ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                >
                  Become a Worker
                </button>
              </li>
              <li>
                <a 
                  onClick={() => navigate('/terms')} 
                  className={`${linkText} transition-colors cursor-pointer text-sm`}
                >
                  Terms & Conditions
                </a>
              </li>
              <li>
                <a 
                  onClick={() => navigate('/privacy')} 
                  className={`${linkText} transition-colors cursor-pointer text-sm`}
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a 
                  onClick={() => navigate('/blog')} 
                  className={`${linkText} transition-colors cursor-pointer text-sm`}
                >
                  Blog
                </a>
              </li>
              <li>
                <a 
                  onClick={() => navigate('/contact')} 
                  className={`${linkText} transition-colors cursor-pointer text-sm`}
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>
          
          {/* Contact */}
          <div className="space-y-6">
            <h3 className={`text-lg font-semibold ${headingText}`}>Contact</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <MapPin className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1 flex-shrink-0`} />
                <p className={`${mutedText} text-sm leading-relaxed`}>
                  123 Street, Toronto, ON, Canada
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'} flex-shrink-0`} />
                <p className={`${mutedText} text-sm`}>
                  +1 234-567-8900
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'} flex-shrink-0`} />
                <p className={`${mutedText} text-sm`}>
                  contact@otw.ca
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Section */}
        <div className={`border-t ${borderColor} mt-12 pt-8 text-center`}>
          <p className={`${mutedText} text-sm`}>
            &copy; {new Date().getFullYear()} OMW. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
 