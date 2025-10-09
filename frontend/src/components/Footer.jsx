import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Mail, Facebook, Twitter, Instagram, MapPin, Linkedin, Youtube, Github } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import Logo from './Logo';
import { useFooterData } from '../app/hooks/useSiteData';

const Footer = () => {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const { data: siteData, loading, error } = useFooterData();
  
  // Navigate to landing page and scroll to Our Services
  const goToServices = (tab) => {
    navigate('/', { state: { scrollToServices: true, activeTab: tab } });
  };

  // Helper function to get social icon component
  const getSocialIcon = (platform) => {
    const platformLower = platform.toLowerCase();
    switch (platformLower) {
      case 'facebook':
      case 'fb':
        return Facebook;
      case 'twitter':
      case 'x':
        return Twitter;
      case 'instagram':
      case 'insta':
        return Instagram;
      case 'linkedin':
      case 'linked-in':
        return Linkedin;
      case 'youtube':
      case 'yt':
        return Youtube;
      case 'github':
      case 'git':
        return Github;
      case 'email':
      case 'mail':
        return Mail;
      case 'phone':
      case 'tel':
        return Phone;
      default:
        // Try to match partial names
        if (platformLower.includes('face')) return Facebook;
        if (platformLower.includes('twit') || platformLower.includes('x.com')) return Twitter;
        if (platformLower.includes('insta')) return Instagram;
        if (platformLower.includes('linked')) return Linkedin;
        if (platformLower.includes('you') || platformLower.includes('tube')) return Youtube;
        if (platformLower.includes('git')) return Github;
        if (platformLower.includes('mail')) return Mail;
        if (platformLower.includes('phone') || platformLower.includes('tel')) return Phone;
        
        // Default fallback
        return Facebook;
    }
  };

  // Helper function to get social hover color
  const getSocialHoverColor = (platform, darkMode) => {
    const platformLower = platform.toLowerCase();
    const colors = {
      facebook: 'hover:bg-blue-500',
      fb: 'hover:bg-blue-500',
      twitter: 'hover:bg-blue-400',
      x: 'hover:bg-gray-800',
      instagram: 'hover:bg-pink-500',
      insta: 'hover:bg-pink-500',
      linkedin: 'hover:bg-blue-600',
      'linked-in': 'hover:bg-blue-600',
      youtube: 'hover:bg-red-500',
      yt: 'hover:bg-red-500',
      github: 'hover:bg-gray-700',
      git: 'hover:bg-gray-700',
      email: 'hover:bg-green-500',
      mail: 'hover:bg-green-500',
      phone: 'hover:bg-green-600',
      tel: 'hover:bg-green-600'
    };
    
    // Direct match
    if (colors[platformLower]) {
      return colors[platformLower];
    }
    
    // Partial matches
    if (platformLower.includes('face')) return 'hover:bg-blue-500';
    if (platformLower.includes('twit')) return 'hover:bg-blue-400';
    if (platformLower.includes('x.com')) return 'hover:bg-gray-800';
    if (platformLower.includes('insta')) return 'hover:bg-pink-500';
    if (platformLower.includes('linked')) return 'hover:bg-blue-600';
    if (platformLower.includes('you') || platformLower.includes('tube')) return 'hover:bg-red-500';
    if (platformLower.includes('git')) return 'hover:bg-gray-700';
    if (platformLower.includes('mail')) return 'hover:bg-green-500';
    if (platformLower.includes('phone') || platformLower.includes('tel')) return 'hover:bg-green-600';
    
    // Default fallback
    return 'hover:bg-blue-500';
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
              <Logo responsive alt={siteData.settings?.site_name || "OMW"} />
            </div>
            <p className={`${mutedText} text-sm leading-relaxed`}>
              {siteData.settings?.site_description || "Your trusted partner for professional home services. Quality, reliability, and convenience at your doorstep."}
            </p>
            <div className="flex space-x-3">
              {siteData.socialLinks && siteData.socialLinks.length > 0 ? (
                siteData.socialLinks.map((link, index) => {
                  const IconComponent = getSocialIcon(link.platform);
                  const hoverColor = getSocialHoverColor(link.platform, darkMode);
                  
                  return (
                    <a 
                      key={index}
                      href={link.url} 
                      target={link.open_in_new_tab ? "_blank" : "_self"}
                      rel={link.open_in_new_tab ? "noopener noreferrer" : undefined}
                      className={`${iconBg} p-3 rounded-full ${hoverColor} hover:text-white transition-all duration-300 transform hover:scale-110 group`}
                      aria-label={link.platform_name}
                      style={{ backgroundColor: link.platform_color && !darkMode ? `${link.platform_color}20` : undefined }}
                    >
                      <IconComponent className={`h-4 w-4 ${iconColor} group-hover:text-white`} />
                    </a>
                  );
                })
              ) : (
                // Fallback social links
                <>
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
                </>
              )}
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
              {/* Dynamic content pages */}
              {siteData.pages && siteData.pages.length > 0 && (
                siteData.pages.map((page, index) => (
                  <li key={index}>
                    <a 
                      onClick={() => navigate(`/${page.page_key}`)} 
                      className={`${linkText} transition-colors cursor-pointer text-sm`}
                    >
                      {page.page_title}
                    </a>
                  </li>
                ))
              )}
              
              {/* Essential static links that should always appear */}
              <li>
                <button 
                  onClick={() => navigate('/worker/signup')}
                  className={`transition-colors text-sm font-medium ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                >
                  Become a Worker
                </button>
              </li>
              
              {/* Fallback static links only if no dynamic pages are available */}
              {(!siteData.pages || siteData.pages.length === 0) && (
                <>
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
                </>
              )}
            </ul>
          </div>
          
          {/* Contact */}
          <div className="space-y-6">
            <h3 className={`text-lg font-semibold ${headingText}`}>Contact</h3>
            <div className="space-y-4">
              {/* Address */}
              {(siteData.settings?.company_address || siteData.settings?.company_city) && (
                <div className="flex items-start space-x-3">
                  <MapPin className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1 flex-shrink-0`} />
                  <p className={`${mutedText} text-sm leading-relaxed`}>
                    {[
                      siteData.settings?.company_address,
                      siteData.settings?.company_city,
                      siteData.settings?.company_state,
                      siteData.settings?.company_country
                    ].filter(Boolean).join(', ') || "123 Street, Toronto, ON, Canada"}
                  </p>
                </div>
              )}
              
              {/* Phone */}
              {siteData.settings?.support_phone && (
                <div className="flex items-center space-x-3">
                  <Phone className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'} flex-shrink-0`} />
                  <p className={`${mutedText} text-sm`}>
                    {siteData.settings.support_phone}
                  </p>
                </div>
              )}
              
              {/* Email */}
              {siteData.settings?.support_email && (
                <div className="flex items-center space-x-3">
                  <Mail className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'} flex-shrink-0`} />
                  <p className={`${mutedText} text-sm`}>
                    {siteData.settings.support_email}
                  </p>
                </div>
              )}
              
              {/* Fallback contact info if no dynamic data */}
              {!siteData.settings && (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Bottom Section */}
        <div className={`border-t ${borderColor} mt-12 pt-8 text-center`}>
          <p className={`${mutedText} text-sm`}>
            {siteData.settings?.copyright_text || `© ${new Date().getFullYear()} ${siteData.settings?.site_name || 'OMW'}. All rights reserved.`}
          </p>
          {siteData.settings?.footer_text && (
            <div 
              className={`${mutedText} text-xs mt-2`}
              dangerouslySetInnerHTML={{ __html: siteData.settings.footer_text }}
            />
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
 