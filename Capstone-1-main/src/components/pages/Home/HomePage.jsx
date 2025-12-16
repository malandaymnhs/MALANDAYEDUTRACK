import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../config/firebase.js";
import Header from "../../layout/Header.jsx";
import Footer from "../../layout/Footer.jsx";
import ImageWithFallback from "../../common/ImageWithFallback.jsx";
 

const HomePage = () => {
  const [activeTab, setActiveTab] = useState("mission");
  const [announcements, setAnnouncements] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isAnnouncementOverlayOpen, setIsAnnouncementOverlayOpen] = useState(false);
  const [activeNewsTab, setActiveNewsTab] = useState("announcements");
  const [currentPage, setCurrentPage] = useState(0);
  const [currentEventPage, setCurrentEventPage] = useState(0);
  const announcementsPerPage = 3;
  const eventsPerPage = 3;
  
  
 
  const primaryColor = "#0A2463"; // Royal blue
  const accentColor = "#FFC72C";  // Honey yellow

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
       
        const announcementsQuery = query(
          collection(db, "announcements"),
          orderBy("createdAt", "desc")
        );
        
        
        const eventsQuery = query(
          collection(db, "events"),
          orderBy("date", "desc")
        );
        
        const announcementsSnapshot = await getDocs(announcementsQuery);
        
        
        setAnnouncements(announcementsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(announcement => announcement.status === 'published')
        );
        
        const eventsSnapshot = await getDocs(eventsQuery);
        
        setUpcomingEvents(eventsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(event => event.status === 'on') // Only show events that are 'on'
        );
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);
 

  const openEventDetails = (event) => {
    setSelectedEvent(event);
    setIsOverlayOpen(true);
    // Prevent scrolling when overlay is open
    document.body.style.overflow = 'hidden';
  };

  const closeOverlay = () => {
    setIsOverlayOpen(false);
    // Re-enable scrolling
    document.body.style.overflow = 'auto';
  };

  const openAnnouncementDetails = (announcement) => {
    setSelectedAnnouncement(announcement);
    setIsAnnouncementOverlayOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeAnnouncementOverlay = () => {
    setIsAnnouncementOverlayOpen(false);
    document.body.style.overflow = 'auto';
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Date not available";
    
    try {
      let date;
      if (dateString && typeof dateString.toDate === 'function') {
        date = dateString.toDate();
      } else if (dateString._seconds) {
        // Handle Firestore Timestamp format
        date = new Date(dateString._seconds * 1000);
      } else {
        date = new Date(dateString);
      }
      
      return date.toLocaleString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Date not available";
    }
  };

  // Navigation functions
  const goToNextPage = () => {
    setCurrentPage((prev) => 
      prev + 1 >= Math.ceil(announcements.length / announcementsPerPage) ? 0 : prev + 1
    );
  };

  const goToPreviousPage = () => {
    setCurrentPage((prev) => 
      prev - 1 < 0 ? Math.ceil(announcements.length / announcementsPerPage) - 1 : prev - 1
    );
  };

  const goToNextEventPage = () => {
    setCurrentEventPage((prev) => 
      prev + 1 >= Math.ceil(upcomingEvents.length / eventsPerPage) ? 0 : prev + 1
    );
  };

  const goToPreviousEventPage = () => {
    setCurrentEventPage((prev) => 
      prev - 1 < 0 ? Math.ceil(upcomingEvents.length / eventsPerPage) - 1 : prev - 1
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 overflow-x-hidden">
      <Header />

     
     <section className="relative min-h-[600px] py-12 md:py-16 flex flex-col items-center justify-center bg-[#0A2463] overflow-hidden">
  <div className="absolute inset-0 opacity-10">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#FFC72C_1px,transparent_1px),linear-gradient(to_bottom,#FFC72C_1px,transparent_1px)] bg-[size:40px_40px]"></div>
  </div>

  <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
    {/* Centered Logo and School Info */}
    <div className="flex flex-col items-center mb-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-4"
      >
        <img 
          src="logo_mnhs-removebg-preview.png" 
          alt="MNHS" 
          className="h-20 drop-shadow-lg filter brightness-0 invert mx-auto"
        />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="text-xl md:text-3xl font-bold text-white text-center"
      >
        <span className="text-[#FFC72C]">Malanday National High School</span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="text-base md:text-xl text-white/90 mt-2 text-center"
      >
        School Division Office - Valenzuela
      </motion.p>
    </div>

    {/* Core Values Section with improved spacing */}
    <div className="w-full flex flex-col lg:flex-row gap-12 px-4 mb-8 items-stretch">
      {/* Image Box - Same height as Core Values box */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="lg:w-1/2 flex items-stretch h-full"
      >
        <div className="bg-white/95 rounded-xl shadow-lg overflow-hidden w-full h-full flex">
          <div className="relative w-full h-full min-h-[350px] flex">
            <img
              src="/students-learning.jpg"
              alt="Students at MNHS"
              className="w-full h-full object-cover"
              style={{ minHeight: "350px" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/50 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">Excellence in Education</h3>
              <p className="text-base md:text-xl text-blue-100">
                Preparing students for the challenges of tomorrow
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Core Values Box - Remains the same */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="lg:w-1/2 flex h-full"
      >
        <div className="bg-white/95 rounded-xl shadow-lg p-6 md:p-8 h-full w-full flex flex-col"
     style={{ backgroundColor: "#d9e9fcff" }}>
          <h2 className="text-2xl md:text-4xl font-bold mb-6 md:mb-8" style={{ color: primaryColor }}>
            Our <span style={{ color: accentColor }}>Core Values</span>
          </h2>
          
          {/* Tab navigation with larger text */}
          <div className="flex mb-8 border-b border-gray-200">
            <button
              onClick={() => setActiveTab("mission")}
              className={`px-6 md:px-8 py-3 md:py-4 font-medium text-base md:text-xl ${
                activeTab === "mission" 
                  ? "border-b-2" 
                  : "text-gray-600 hover:text-blue-600"
              }`}
              style={{ 
                borderColor: activeTab === "mission" ? primaryColor : 'transparent',
                color: activeTab === "mission" ? primaryColor : 'inherit'
              }}
            >
              Mission
            </button>
            <button
              onClick={() => setActiveTab("vision")}
              className={`px-6 md:px-8 py-3 md:py-4 font-medium text-base md:text-xl ${
                activeTab === "vision" 
                  ? "border-b-2" 
                  : "text-gray-600 hover:text-blue-600"
              }`}
              style={{ 
                borderColor: activeTab === "vision" ? primaryColor : 'transparent',
                color: activeTab === "vision" ? primaryColor : 'inherit'
              }}
            >
              Vision
            </button>
          </div>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {activeTab === "mission" ? (
                <>
                  <h3 className="text-xl md:text-2xl font-bold" style={{ color: primaryColor }}>
                    To protect and promote the right of every Filipino
                  </h3>
                  <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                    We envision Malanday National High School as a premier institution that nurtures globally competitive, morally upright, and socially responsible individuals who are prepared to meet the challenges of the 21st century.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-xl md:text-2xl font-bold" style={{ color: primaryColor }}>
                    To protect and promote the right of every Filipino
                  </h3>
                  <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                    To provide quality education that equips students with academic excellence, technical skills, and strong moral values through innovative teaching methods, modern facilities, and a nurturing environment that fosters holistic development.
                  </p>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  </div>
</section>
      
      <section id="announcements" className="py-12 md:py-20 bg-white">
        <div className="container mx-auto px-6 max-w-7xl">
          {/* Tab Navigation - upper left */}
    <nav className="relative flex justify-center mb-12">
  <div className="flex bg-white rounded-full shadow-lg overflow-hidden border border-gray-200">
    {[
      { id: "announcements", label: "Announcements" },
      { id: "events", label: "Events" }
    ].map((tab) => (
      <button
        key={tab.id}
        onClick={() => setActiveNewsTab(tab.id)}
        className={`
          px-6 md:px-8 py-2.5 md:py-3 text-base md:text-lg font-semibold transition-all duration-200
          focus:outline-none
          ${activeNewsTab === tab.id
            ? "bg-amber-400 text-white shadow"
            : "bg-transparent text-gray-700 hover:bg-gray-100"
          }
        `}
        style={{
          borderRadius: 9999,
          boxShadow: activeNewsTab === tab.id ? "0 2px 8px rgba(0,0,0,0.07)" : "none"
        }}
        aria-current={activeNewsTab === tab.id ? "page" : undefined}
      >
        {tab.label}
      </button>
    ))}
  </div>
</nav>

    <div className="text-center mb-16">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-2xl md:text-4xl font-bold mb-4"
      >
        <span style={{ color: primaryColor }}>
          {activeNewsTab === "announcements" ? "Announcements" : "Events"}
        </span>
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto"
      >
        {activeNewsTab === "announcements"
          ? "Stay updated with the latest news and information from our school"
          : "Mark your calendars for these important school activities"}
      </motion.p>
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        transition={{ duration: 0.6 }}
        className="w-24 h-1 mx-auto mt-6 rounded-full"
        style={{ backgroundColor: accentColor }}
      />
    </div>

    <AnimatePresence mode="wait">
      <motion.div
        key={activeNewsTab}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="min-h-[600px]"
      >
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="flex items-center gap-2">
              <div 
                className="h-12 w-12 rounded-full border-4"
                style={{ 
                  borderColor: `${accentColor}`,
                  borderTopColor: 'transparent',
                }}
              />
              <span className="text-gray-600 font-medium">Loading...</span>
            </div>
          </div>
        ) : activeNewsTab === "announcements" ? (
          announcements.length > 0 ? (
            <div className="relative">
              <motion.div
                className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 min-h-[500px]"
                key={`announcements-page-${currentPage}`}
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {announcements
                  .slice(
                    currentPage * announcementsPerPage, 
                    (currentPage + 1) * announcementsPerPage
                  )
                  .map((announcement) => (
                    <motion.div
                      key={announcement.id}
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      whileHover={{ y: -3 }}
                      className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col h-full"
                      onClick={() => openAnnouncementDetails(announcement)
                      }
                    >
                      <div className="relative h-48 overflow-hidden">
                        <ImageWithFallback
                          src={announcement.imageUrl}
                          alt={announcement.title}
                          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30" />
                        <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold" 
                            style={{ backgroundColor: accentColor, color: primaryColor }}>
                          {formatDate(announcement.createdAt).split(',')[0]}
                        </div>
                      </div>
                      <div className="p-6 flex-1 flex flex-col">
                        <div className="flex mb-3">
                          <span className="text-xs font-semibold px-2 py-1 rounded" 
                                style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                            {announcement.status || 'Announcement'}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold mb-3 hover:text-blue-600 transition-colors duration-300">
                          {announcement.title}
                        </h3>
                        <p className="text-gray-600 mb-4 line-clamp-3">
                          {announcement.content}
                        </p>
                        {announcement.socialMediaLink && (
                          <div className="text-sm text-gray-600 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(announcement.socialMediaLink, '_blank');
                              }}
                              className="hover:underline"
                              style={{ color: primaryColor }}
                            >
                              Social Media Link
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
              </motion.div>

              {/* Navigation Controls */}
              <div className="mt-12 min-h-[120px] flex items-center justify-center">
              {announcements.length > announcementsPerPage && (
  <div className="flex flex-col items-center gap-6">
    {/* Page indicator */}
    <div className="text-gray-600">
      Page {currentPage + 1} of {Math.ceil(announcements.length / announcementsPerPage)}
    </div>
    
    {/* Navigation Buttons */}
    <div className="flex items-center gap-4">
      <button
        onClick={goToPreviousPage}
        className="flex items-center px-6 py-3 rounded-lg bg-amber-400 text-white hover:bg-amber-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-400 shadow-md hover:shadow-lg"
        aria-label="Previous page"
      >
        <svg 
          className="w-5 h-5 mr-2" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Previous
      </button>

      {/* Pagination Numbers (dynamic window: prev,current,next …) */}
      <div className="flex gap-2 items-center">
        {(() => {
          const totalPages = Math.ceil(announcements.length / announcementsPerPage);
          if (!Number.isFinite(totalPages) || totalPages <= 0) return null;
          const start = Math.max(0, Math.min(currentPage - 1, Math.max(0, totalPages - 3)));
          const end = Math.min(totalPages - 1, start + 2);
          const pages = [];
          for (let i = start; i <= end; i++) pages.push(i);
          return (
            <>
              {pages.map((index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index)}
                  className={`min-w-[40px] h-10 flex items-center justify-center rounded-lg transition-all duration-200 
                    ${currentPage === index 
                      ? 'bg-amber-400 text-white font-bold shadow-md' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  aria-label={`Go to page ${index + 1}`}
                  aria-current={currentPage === index ? 'true' : 'false'}
                >
                  {index + 1}
                </button>
              ))}
              {end < totalPages - 1 && (
                <span className="px-2 text-gray-500 select-none">…</span>
              )}
            </>
          );
        })()}
      </div>

      <button
        onClick={goToNextPage}
        className="flex items-center px-6 py-3 rounded-lg bg-amber-400 text-white hover:bg-amber-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-400 shadow-md hover:shadow-lg"
        aria-label="Next page"
      >
        Next
        <svg 
          className="w-5 h-5 ml-2" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>
  </div>
)}
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 bg-gray-50 rounded-xl"
            >
              <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-700">No announcements</h3>
              <p className="mt-2 text-gray-500">
                There are currently no announcements to display
              </p>
            </motion.div>
          )
        ) : (
          upcomingEvents.length > 0 ? (
            <div className="relative">
              <motion.div
                className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 min-h-[500px]"
                key={`events-page-${currentEventPage}`}
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {upcomingEvents
                  .slice(
                    currentEventPage * eventsPerPage,
                    (currentEventPage + 1) * eventsPerPage
                  )
                  .map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 1 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  whileHover={{ y: -5 }}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col h-full"
                  onClick={() => openEventDetails(event)}
                >
                  <div className="relative h-48 overflow-hidden">
                    <ImageWithFallback
                      src={event.imageUrl}
                      alt={event.title}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30" />
                    <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold" 
                        style={{ backgroundColor: accentColor, color: primaryColor }}>
                      {formatDate(event.date).split(',')[0]}
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex mb-3">
                      <span className="text-xs font-semibold px-2 py-1 rounded" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                        Event
                      </span>
                    </div>
                    <h3 className="text-xl font-bold mb-3 hover:text-blue-600 transition-colors duration-300">
                      {event.title}
                    </h3>
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {event.description}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {event.location && (
                        <div className="text-sm text-gray-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          </svg>
                          {event.location}
                        </div>
                      )}
                      {event.time && (
                        <div className="text-sm text-gray-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          {event.time}
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => openEventDetails(event)}
                      className="mt-4 text-sm font-medium hover:underline inline-block"
                      style={{ color: primaryColor }}
                    >
                      View details →
                    </button>
                  </div>
                </motion.div>
                  ))}
              </motion.div>

              {/* Navigation Controls for Events */}
              <div className="mt-12 min-h-[120px] flex items-center justify-center">
              {upcomingEvents.length > eventsPerPage && (
      <div className="flex flex-col items-center gap-6">
        {/* Page indicator */}
        <div className="text-gray-600">
          Page {currentEventPage + 1} of {Math.ceil(upcomingEvents.length / eventsPerPage)}
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={goToPreviousEventPage}
            className="flex items-center px-6 py-3 rounded-lg bg-amber-400 text-white hover:bg-amber-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-400 shadow-md hover:shadow-lg"
            aria-label="Previous page"
          >
            <svg 
              className="w-5 h-5 mr-2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Previous
          </button>

          {/* Pagination Numbers (dynamic window: prev,current,next …) */}
          <div className="flex gap-2 items-center">
            {(() => {
              const totalPages = Math.ceil(upcomingEvents.length / eventsPerPage);
              if (!Number.isFinite(totalPages) || totalPages <= 0) return null;
              const start = Math.max(0, Math.min(currentEventPage - 1, Math.max(0, totalPages - 3)));
              const end = Math.min(totalPages - 1, start + 2);
              const pages = [];
              for (let i = start; i <= end; i++) pages.push(i);
              return (
                <>
                  {pages.map((index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentEventPage(index)}
                      className={`min-w-[40px] h-10 flex items-center justify-center rounded-lg transition-all duration-200 
                        ${currentEventPage === index 
                          ? 'bg-amber-400 text-white font-bold shadow-md' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      aria-label={`Go to page ${index + 1}`}
                      aria-current={currentEventPage === index ? 'true' : 'false'}
                    >
                      {index + 1}
                    </button>
                  ))}
                  {end < totalPages - 1 && (
                    <span className="px-2 text-gray-500 select-none">…</span>
                  )}
                </>
              );
            })()}
          </div>

          <button
            onClick={goToNextEventPage}
            className="flex items-center px-6 py-3 rounded-lg bg-amber-400 text-white hover:bg-amber-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-400 shadow-md hover:shadow-lg"
            aria-label="Next page"
          >
            Next
            <svg 
              className="w-5 h-5 ml-2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>
)}
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 bg-gray-50 rounded-xl"
            >
              <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-700">No upcoming events</h3>
              <p className="mt-2 text-gray-500">
                Check back later for scheduled events and activities
              </p>
            </motion.div>
          )
        )}
      </motion.div>
    </AnimatePresence>
  </div>
</section>

      
      <AnimatePresence>
        {isAnnouncementOverlayOpen && selectedAnnouncement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={closeAnnouncementOverlay}
          >
            <motion.div
              initial={{ y: 20, scale: 0.95, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 20, scale: 0.95, opacity: 0 }}
              transition={{ 
                type: "spring", 
                damping: 25, 
                stiffness: 300 
              }}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <div className="h-64 sm:h-80 md:h-96 overflow-hidden">
                  {selectedAnnouncement.imageUrl ? (
                    <motion.img
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.6 }}
                      src={selectedAnnouncement.imageUrl}
                      alt={selectedAnnouncement.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/mnhslogo.jpg";
                        e.target.style.objectFit = "contain";
                        e.target.style.padding = "2rem";
                        e.target.style.backgroundColor = "#f3f4f6";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                      <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                  
                  <motion.div 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="absolute top-4 right-4 px-4 py-2 rounded-full text-sm font-bold shadow-lg" 
                    style={{ backgroundColor: accentColor, color: primaryColor }}
                  >
                    {formatDate(selectedAnnouncement.createdAt)}
                  </motion.div>
                  
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    onClick={closeAnnouncementOverlay}
                    className="absolute top-4 left-4 p-2 rounded-full bg-white/80 hover:bg-white text-gray-800 shadow-md hover:shadow-lg transition-all duration-200"
                    aria-label="Close details"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                  
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="absolute bottom-0 left-0 right-0 p-6 text-white"
                  >
                    <h2 className="text-2xl md:text-3xl font-bold mb-2 drop-shadow-lg">
                      {selectedAnnouncement.title}
                    </h2>
                  </motion.div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <div className="p-6 md:p-8">
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
                  >
                    <div className="bg-gray-50 rounded-xl p-4 flex items-center shadow-sm">
                      <div className="rounded-full p-3 mr-3" style={{ backgroundColor: `${accentColor}30` }}>
                        <svg className="w-6 h-6" style={{ color: accentColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 font-medium uppercase">Posted on</div>
                        <div className="font-medium">{formatDate(selectedAnnouncement.createdAt)}</div>
                      </div>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="prose max-w-none"
                  >
                    <h3 className="text-xl font-medium mb-3" style={{ color: primaryColor }}>
                      {selectedAnnouncement.title}
                    </h3>
                    <p className="text-gray-700 whitespace-pre-line">
                      {selectedAnnouncement.content}
                    </p>
                  </motion.div>
                  
                  {selectedAnnouncement.socialMediaLink && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="mt-8"
                    >
                      <button 
                        type="button" 
                        onClick={() => window.open(selectedAnnouncement.socialMediaLink, '_blank')}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-md text-white"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Visit Social Media Link
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
        <AnimatePresence>
        {isOverlayOpen && selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={closeOverlay}
          >
            <motion.div
              initial={{ y: 20, scale: 0.95, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 20, scale: 0.95, opacity: 0 }}
              transition={{ 
                type: "spring", 
                damping: 25, 
                stiffness: 300 
              }}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              
              <div className="relative">
                <div className="h-64 sm:h-80 md:h-96 overflow-hidden">
                  {selectedEvent.imageUrl ? (
                    <motion.img
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.6 }}
                      src={selectedEvent.imageUrl}
                      alt={selectedEvent.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/mnhslogo.jpg";
                        e.target.style.objectFit = "contain";
                        e.target.style.padding = "2rem";
                        e.target.style.backgroundColor = "#f3f4f6";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                      <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                  
                  
                  <motion.div 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="absolute top-4 right-4 px-4 py-2 rounded-full text-sm font-bold shadow-lg" 
                    style={{ backgroundColor: accentColor, color: primaryColor }}
                  >
                    {formatDate(selectedEvent.date).split(',')[0]}
                  </motion.div>
                 
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    onClick={closeOverlay}
                    className="absolute top-4 left-4 p-2 rounded-full bg-white/80 hover:bg-white text-gray-800 shadow-md hover:shadow-lg transition-all duration-200"
                    aria-label="Close details"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                  
                  
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="absolute bottom-0 left-0 right-0 p-6 text-white"
                  >
                    <h2 className="text-2xl md:text-3xl font-bold mb-2 drop-shadow-lg">
                      {selectedEvent.title}
                    </h2>
                  </motion.div>
                </div>
              </div>
              
              
              <div className="flex-1 overflow-y-auto">
                <div className="p-6 md:p-8">
                  
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
                  >
                    <div className="bg-gray-50 rounded-xl p-4 flex items-center shadow-sm">
                      <div className="rounded-full p-3 mr-3" style={{ backgroundColor: `${accentColor}30` }}>
                        <svg className="w-6 h-6" style={{ color: accentColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 font-medium uppercase">Date</div>
                        <div className="font-medium">{formatDate(selectedEvent.date)}</div>
                      </div>
                    </div>
                    
                    {selectedEvent.time && (
                      <div className="bg-gray-50 rounded-xl p-4 flex items-center shadow-sm">
                        <div className="rounded-full p-3 mr-3" style={{ backgroundColor: `${accentColor}30` }}>
                          <svg className="w-6 h-6" style={{ color: accentColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 font-medium uppercase">Time</div>
                          <div className="font-medium">{selectedEvent.time}</div>
                        </div>
                      </div>
                    )}
                    
                    {selectedEvent.location && (
                      <div className="bg-gray-50 rounded-xl p-4 flex items-center shadow-sm">
                        <div className="rounded-full p-3 mr-3" style={{ backgroundColor: `${accentColor}30` }}>
                          <svg className="w-6 h-6" style={{ color: accentColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 font-medium uppercase">Venue</div>
                          <div className="font-medium">{selectedEvent.location}</div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                  
                 
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="prose max-w-none"
                  >
                    <h3 className="text-xl font-medium mb-3" style={{ color: primaryColor }}>Description</h3>
                    <p className="text-gray-700 whitespace-pre-line">
                      {selectedEvent.description}
                    </p>
                  </motion.div>
                  
                  
                  {selectedEvent.organizer && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="mt-8 p-4 border-l-4 rounded bg-gray-50" 
                      style={{ borderColor: accentColor }}
                    >
                      <h3 className="text-lg font-medium mb-2" style={{ color: primaryColor }}>Organizer</h3>
                      <p className="text-gray-700 flex items-center">
                        <svg className="w-5 h-5 mr-2" style={{ color: accentColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {selectedEvent.organizer}
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default HomePage;