import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import PropTypes from "prop-types";

const UserTypeSelection = ({ onClose }) => {
  const [selectedType, setSelectedType] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    },
    exit: { opacity: 0, y: -20 }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    hover: { scale: 1.02, transition: { duration: 0.2 } },
    tap: { scale: 0.98 }
  };

  const handleSelection = async (type) => {
    setSelectedType(type);
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 600));
    onClose();
    navigate(type === "student" ? "/studentRequestDocument" : "/alumniRequestDocument");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="w-full max-w-6xl mx-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1 rounded-full bg-blue-700 hover:bg-blue-600 text-white transition-colors z-10"
          >
            <X size={24} />
          </button>

          <div className="relative bg-gradient-to-r from-blue-800 to-blue-700 p-4 sm:p-6 md:p-8">
            <div className="absolute inset-0 bg-grid-white/[0.05] backdrop-blur-[1px]"></div>
            <div className="relative">
              <div className="flex justify-center mb-4 sm:mb-6">
                <img
                  src="logo natin.png"
                  alt="Logo"
                  className="h-10 sm:h-12 md:h-16 lg:h-20 transform transition-transform duration-300 hover:scale-105"
                />
              </div>
              <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-white text-center">
                Document Request Portal
              </h1>
            </div>
          </div>

          <div className="p-4 sm:p-6 md:p-8">
            <h2 className="text-md sm:text-xl md:text-2xl font-semibold text-center mb-6 sm:mb-8 text-gray-800">
              I am requesting a document as a:
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8 max-w-4xl mx-auto">
              <AnimatePresence>
                <motion.div
                  key="student-option"
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover="hover"
                  whileTap="tap"
                  className={`group relative overflow-hidden p-4 sm:p-6 md:p-8 border-2 rounded-xl cursor-pointer transition-all duration-300 ${
                    selectedType === "student"
                      ? "border-blue-500 bg-blue-50/50 shadow-lg"
                      : "border-gray-200 hover:border-blue-400 hover:shadow-md"
                  }`}
                  onClick={() => handleSelection("student")}
                  disabled={isLoading}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="h-20 w-20 sm:h-24 sm:w-24 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 sm:h-12 sm:w-12 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v7" />
                      </svg>
                    </div>
                    <h3 className="text-md sm:text-lg font-medium text-gray-900 mb-2">Current Student</h3>
                    <p className="text-sm sm:text-base text-gray-600">
                      Request documents as a currently enrolled student of the institution
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  key="alumni-option"
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover="hover"
                  whileTap="tap"
                  className={`group relative overflow-hidden p-4 sm:p-6 md:p-8 border-2 rounded-xl cursor-pointer transition-all duration-300 ${
                    selectedType === "alumni"
                      ? "border-[#0A2463] bg-blue-50/50 shadow-lg"
                      : "border-gray-200 hover:border-[#0A2463] hover:shadow-md"
                  }`}
                  onClick={() => handleSelection("alumni")}
                  disabled={isLoading}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="h-20 w-20 sm:h-24 sm:w-24 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 sm:h-12 sm:w-12 text-[#0A2463]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <h3 className="text-md sm:text-lg font-medium text-gray-900 mb-2">Alumni</h3>
                    <p className="text-sm sm:text-base text-gray-600">
                      Request documents as a former student or graduate of the institution
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 sm:mt-8 text-center text-gray-500 text-xs sm:text-sm md:text-base"
            >
              <p>Select the option that best describes your current status</p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

UserTypeSelection.propTypes = {
  onClose: PropTypes.func.isRequired
};

export default UserTypeSelection;
