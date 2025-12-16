import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "../../layout/Header";
import Footer from "../../layout/Footer";

const AboutPage = () => {
  const [activeTab, setActiveTab] = useState("history");
  const [timelineProgress, setTimelineProgress] = useState(0);

  // Data
  const facilities = [
    { icon: "📚", name: "Library", desc: "Well-stocked with academic and reference materials" },
    { icon: "🌿", name: "Garden", desc: "Green space for relaxation and environmental studies" },
    { icon: "🔬", name: "Science Lab", desc: "Fully equipped for hands-on experiments" },
    { icon: "💻", name: "Computer Lab", desc: "Modern technology for digital learning" },
    { icon: "🔧", name: "TLE Lab", desc: "Technical and livelihood education facilities" },
    { icon: "🏢", name: "3 Buildings", desc: "Four-floor structures with spacious classrooms" }
  ];

  const stats = [
    { value: "6+", label: "Years of Service" },
    { value: "3", label: "Modern Buildings" },
    { value: "2", label: "Senior High Strands" },
    { value: "1000+", label: "Students Empowered" }
  ];

  const timeline = [
    { year: "2018", title: "Foundation", description: "Malanday National High School was established to serve the growing educational needs of the community." },
    { year: "2019", title: "First Graduates", description: "Our first batch of students successfully completed their junior high school education." },
    { year: "2020", title: "Senior High Expansion", description: "Added ABM and GAS strands to our Senior High School program." },
    { year: "2022", title: "New Building", description: "Completed construction of our third academic building with modern facilities." },
    { year: "2024", title: "Recognition", description: "Recognized as one of Valenzuela's most improved public high schools." }
  ];

  const coreValues = [
    { icon: "🧠", title: "Excellence", desc: "Pursuing the highest standards in all we do" },
    { icon: "❤️", title: "Integrity", desc: "Upholding honesty and strong moral principles" },
    { icon: "🤝", title: "Respect", desc: "Valuing diversity and treating all with dignity" },
    { icon: "🌱", title: "Innovation", desc: "Embracing creativity and progressive thinking" },
    { icon: "🏡", title: "Community", desc: "Fostering strong ties with our stakeholders" },
    { icon: "📚", title: "Lifelong Learning", desc: "Cultivating curiosity and continuous growth" }
  ];

  useEffect(() => {
    setActiveTab("history");
    
    const handleScroll = () => {
      const timelineSection = document.getElementById("timeline");
      if (timelineSection) {
        const rect = timelineSection.getBoundingClientRect();
        const progress = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / rect.height));
        setTimelineProgress(progress);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="bg-white">
      <Header />
      
      
      <section className="relative h-[80vh] min-h-[600px] bg-[#0A2463] overflow-hidden">
        
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#FFC72C_1px,transparent_1px),linear-gradient(to_bottom,#FFC72C_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        </div>

        
        <div className="container mx-auto h-full flex items-center px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="text-white"
            >
              <div className="mb-8">
                <span className="inline-block px-4 py-2 bg-[#FFC72C] text-[#0A2463] rounded-full text-sm font-bold mb-4">
                  About Our School
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                  Shaping Futures at <span className="text-[#FFC72C]">Malanday NHS</span>
                </h1>
                <p className="text-xl md:text-2xl opacity-90 mb-8">
                  Since 2018, we&#39;ve been committed to excellence in education, serving the community of Valenzuela City with pride and dedication.
                </p>
                <div className="flex flex-wrap gap-4">
                </div>
              </div>
            </motion.div>

            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative hidden md:block"
            >
              
              <div className="relative rounded-xl overflow-hidden shadow-2xl border-4 border-white transform rotate-2">
                <img
                  src="/background 2.jpg"
                  alt="Malanday National High School Campus"
                  className="w-full h-auto object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A2463]/80 to-transparent"></div>
              </div>
            </motion.div>
          </div>
        </div>

        
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-20">
            <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" fill="#FFC72C"></path>
            <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5" fill="#FFC72C"></path>
            <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,233.88-58.6c12.23-1.93,24.25-3.57,36.62-4.81V0Z" fill="#FFC72C"></path>
          </svg>
        </div>
      </section>


      <div id="about-content" className="relative bg-white">
        <nav className="z-40 bg-amber-400 shadow-sm text-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex overflow-x-auto">
              {[
                { id: "history", label: "Our History" }, 
                { id: "mission", label: "Our Core Values" }, 
                { id: "facilities", label: "Facilities" }, 
                { id: "achievements", label: "Achievements" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 whitespace-nowrap border-b-2 transition-all
                    ${
                      activeTab === tab.id 
                        ? "font-bold border-white" 
                        : "font-normal border-transparent hover:font-bold"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-6 py-16">
          <AnimatePresence mode="wait">
            
            {activeTab === "history" && (
              <motion.div
                key="history"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-16">
                  <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#0A2463]">
                    Our <span className="text-[#FFC72C]">Journey</span>
                  </h2>
                  <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                    From humble beginnings to becoming a cornerstone of education in Valenzuela City
                  </p>
                </div>

                
                <div id="timeline" className="mb-28">
                  <div className="relative max-w-4xl mx-auto">
                    <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gray-200"></div>
                    
                    {/* Progress indicator */}
                    <div 
                      className="absolute left-1/2 transform -translate-x-1/2 w-1 bg-[#FFC72C] origin-top"
                      style={{ height: `${timelineProgress * 100}%` }}
                    ></div>
                    
                    {timeline.map((item, index) => {
                      const isLeft = index % 2 === 0;
                      const progressForItem = Math.min(1, Math.max(0, (timelineProgress * timeline.length) - index));
                      
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          className={`relative mb-16 ${isLeft ? "pr-8 md:pr-0 md:pl-8 text-left md:text-right" : "pl-8"}`}
                          style={{ 
                            marginLeft: isLeft ? 0 : "50%",
                            marginRight: isLeft ? "50%" : 0
                          }}
                        >
                          <div className={`p-6 rounded-xl shadow-md bg-white ${isLeft ? "md:mr-6" : "md:ml-6"}`}>
                            <div className="flex items-center mb-2">
                              <div className={`w-4 h-4 rounded-full ${progressForItem > 0 ? "bg-[#FFC72C]" : "bg-gray-300"}`}></div>
                              <span className="ml-2 font-bold text-[#0A2463]">{item.year}</span>
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-[#0A2463]">{item.title}</h3>
                            <p className="text-gray-600">{item.description}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                
                <div className="bg-[#F8F9FA] rounded-2xl p-8 md:p-12 mb-16">
                  <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bold mb-6 text-[#0A2463]">
                        Malanday NHS <span className="text-[#FFC72C]">Today</span>
                      </h3>
                      <p className="text-gray-600 mb-6">
                        From our humble beginnings, we&#39;ve grown into an institution with three modern buildings housing state-of-the-art facilities, serving over 1,000 students annually.
                      </p>
                      <p className="text-gray-600">
                        Our Senior High School program offers two academic strands: <span className="font-semibold text-[#0A2463]">Accountancy, Business, and Management (ABM)</span> and <span className="font-semibold text-[#0A2463]">General Academic Strand (GAS)</span>, preparing students for both higher education and professional careers.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {stats.map((stat, index) => (
                        <motion.div
                          key={index}
                          whileHover={{ y: -5 }}
                          className="bg-white p-4 rounded-lg shadow-sm text-center border border-gray-100"
                        >
                          <div className="text-3xl font-bold text-[#FFC72C]">{stat.value}</div>
                          <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            
            {activeTab === "mission" && (
              <motion.div
                key="mission"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                

                
                <div className="mb-16">
                  <h3 className="text-2xl md:text-3xl font-bold mb-8 text-center text-[#0A2463]">
                    Our <span className="text-[#FFC72C]">Core Values</span>
                  </h3>
                  
                  <div className="grid md:grid-cols-3 gap-6">
                    {coreValues.map((value, index) => (
                      <motion.div
                        key={index}
                        whileHover={{ scale: 1.03 }}
                        className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-center"
                      >
                        <div className="text-4xl mb-4">{value.icon}</div>
                        <h4 className="text-xl font-bold mb-2 text-[#0A2463]">{value.title}</h4>
                        <p className="text-gray-600">{value.desc}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            
            {activeTab === "facilities" && (
              <motion.div
                key="facilities"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-16">
                  <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#0A2463]">
                    Our <span className="text-[#FFC72C]">Facilities</span>
                  </h2>
                  <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                    State-of-the-art learning environments designed to inspire and empower
                  </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                  {facilities.map((facility, index) => (
                    <motion.div
                      key={index}
                      whileHover={{ y: -5 }}
                      className="bg-white rounded-lg p-6 shadow-sm border border-gray-100"
                    >
                      <div className="text-4xl mb-4">{facility.icon}</div>
                      <h3 className="text-xl font-bold mb-2 text-[#0A2463]">{facility.name}</h3>
                      <p className="text-gray-600">{facility.desc}</p>
                    </motion.div>
                  ))}
                </div>

                
                <div className="bg-[#0A2463] rounded-2xl overflow-hidden">
                  <div className="grid md:grid-cols-2">
                    <div className="p-8 md:p-12 text-white">
                      <h3 className="text-2xl md:text-3xl font-bold mb-6">Experience Our Campus</h3>
                      <p className="mb-8">
                        Our 3-building campus features modern classrooms, specialized laboratories, and green spaces designed to create an optimal learning environment.
                      </p>
                    </div>
                    <div className="relative h-64 md:h-auto">
                      <img 
                        src="/campus-aerial.jpg" 
                        alt="MNHS Campus" 
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            
            {activeTab === "achievements" && (
              <motion.div
                key="achievements"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-16">
                  <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#0A2463]">
                    Our <span className="text-[#FFC72C]">Achievements</span>
                  </h2>
                  <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                    Celebrating excellence and milestones in our journey
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-16">
                  <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-2xl font-bold mb-6 text-[#0A2463] border-b-2 border-[#FFC72C] pb-2">
                      Academic Excellence
                    </h3>
                    <ul className="space-y-4">
                      {[
                        "Consistently above-average performance in National Achievement Tests",
                        "100% graduation rate for Senior High School students",
                        "Multiple students qualifying for prestigious university scholarships",
                        "Recognition from DepEd for curriculum innovation"
                      ].map((item, index) => (
                        <li key={index} className="flex items-start">
                          <svg className="w-5 h-5 text-[#FFC72C] mr-2 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                          <span className="text-gray-600">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-2xl font-bold mb-6 text-[#0A2463] border-b-2 border-[#FFC72C] pb-2">
                      Student Achievements
                    </h3>
                    <ul className="space-y-4">
                      {[
                        "Winners in regional science and math competitions",
                        "Outstanding performers in sports leagues and cultural events",
                        "Student-led community service initiatives recognized by local government",
                        "Successful alumni in various professional fields"
                      ].map((item, index) => (
                        <li key={index} className="flex items-start">
                          <svg className="w-5 h-5 text-[#FFC72C] mr-2 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                          <span className="text-gray-600">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bg-[#FFC72C] rounded-2xl p-8 md:p-12 text-[#0A2463]">
                  <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bold mb-6">
                        Looking to the <span className="text-[#0A2463]">Future</span>
                      </h3>
                      <p className="mb-6">
                        As we celebrate our achievements, we remain committed to continuous improvement and innovation in education.
                      </p>
                      <p>
                        Our future plans include expanding our STEM program, enhancing our technology infrastructure, and forging more partnerships with industry leaders to provide our students with real-world learning opportunities.
                      </p>
                    </div>
                    <div className="relative">
                      <img 
                        src="/students-future.jpg" 
                        alt="Students looking to the future" 
                        className="rounded-lg shadow-lg w-full"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AboutPage;