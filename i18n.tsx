import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const LANGUAGE_STORAGE_key = 'veo-app-language';

export type Language = 'en' | 'id' | 'es' | 'zh' | 'hi' | 'ar' | 'pt' | 'bn' | 'ru' | 'ja' | 'de' | 'fr';
type Translations = { [key: string]: string | string[] | Translations };

export const languageMap: { [key in Language]: string } = {
  en: 'English',
  id: 'Bahasa Indonesia',
  es: 'Español',
  zh: '中文 (简体)',
  hi: 'हिन्दी',
  ar: 'العربية',
  pt: 'Português',
  bn: 'বাংলা',
  ru: 'Русский',
  ja: '日本語',
  de: 'Deutsch',
  fr: 'Français',
};

const enTranslations: Translations = {
    appName: "AL ANSHOR VEO GENERATOR",
    appTagline: "Generate stunning videos from text or images.",
    manageStoryApiKeys: "Story API Key",
    manageVideoApiKeys: "Video & Thumbnail API Key",
    settingsButton: "Settings",
    tutorialButton: "Tutorial",
    promptLabel: "Prompt",
    promptPlaceholder: "A majestic lion overlooking the savanna at sunset...",
    promptHint: "You can use plain text or a JSON formatted string.",
    referenceImageLabel: "Reference Image (Optional)",
    uploadFile: "Upload a file",
    dragAndDrop: "or drag and drop",
    fileTypes: "PNG, JPG, GIF up to 10MB",
    generationSettings: "Generation Settings",
    aspectRatioLabel: "Aspect Ratio",
    soundLabel: "Sound",
    enableSound: "Enable sound",
    resolutionLabel: "Resolution",
    videoKeyMissingWarning: "Please add a professional Video API Key to begin.",
    generateButton: "Generate Video",
    generatingButton: "Generating Video...",
    loaderTitle: "Generating Your Video",
    loadingMessages: [ "Initializing VEO model...", "Analyzing your prompt...", "Composing the main scene...", "Generating initial frames...", "Rendering video sequence... this may take a few minutes.", "Upscaling to high resolution...", "Adding sound and final touches...", "Almost there, preparing the final video file." ],
    playerTitle: "Generation Complete!",
    downloadButton: "Download Video",
    storyApiKeyManagerTitle: "Story API Key",
    videoApiKeyManagerTitle: "Professional Video & Thumbnail API Key",
    addNewStoryKeyLabel: "Add New Story API Key",
    addNewVideoKeyLabel: "Add New Professional Video & Thumbnail API Key",
    apiKeyInputPlaceholder: "Enter your Gemini API Key",
    addKeyButton: "Add Key",
    validatingButton: "Validating...",
    savedStoryKeysLabel: "Saved Story Keys",
    savedVideoKeysLabel: "Saved Professional Video & Thumbnail Keys",
    noKeysSaved: "No API Keys saved.",
    addKeyPrompt: "Add a key above to get started.",
    closeButton: "Close",
    errorKeyEmpty: "API Key cannot be empty.",
    errorKeyExists: "This API Key has already been added.",
    errorKeyInvalid: "Invalid API Key or network issue. Please check the key and try again.",
    generationFailed: "Generation Failed",
    errorRateLimit: "The service is currently busy due to high demand. Please wait a moment and try again.",
    alertEnterPrompt: "Please enter a prompt.",
    alertSetStoryApiKey: "Please set an active Story API Key before generating.",
    alertSetVideoApiKey: "Please set an active Professional Video & Thumbnail API key before generating.",
    alertSetVideoThumbnailApiKey: "Please set an active Video & Thumbnail API key before generating a thumbnail.",
    backToStoryboard: "Back to Storyboard",
    confirmButton: "OK",
    revalidateAllButton: "Re-validate All",
    apiKeyStatuses: {
      valid: "VALID",
      invalid: "INVALID",
      checking: "CHECKING...",
      unchecked: "UNCHECKED"
    },
    publishingKit: {
      copyButton: "Copy",
      copiedButton: "Copied!",
      aspectRatioLabel: "Aspect Ratio:",
      generateThumbnailButton: "Generate Thumbnail",
      generatingThumbnailButton: "Generating...",
      downloadButton: "Download",
      thumbnailIdea: "Thumbnail Idea",
      simpleImagePrompt: "Simple Image Prompt",
      advancedJsonPrompt: "Advanced JSON Prompt",
      promptSource: "Prompt Source",
      promptSourceSimple: "Simple Prompt",
      promptSourceAdvanced: "Advanced JSON Prompt",
      targetLanguageRegion: "Target Language & Region",
      generatingAssetsFor: "Generating assets for",
      errorJsonParse: "Error: Could not parse JSON from AI.",
      errorCaptionMissing: "Could not find text for thumbnail overlay.",
      errorConceptMissing: "Thumbnail concept not found.",
      errorPromptEmpty: "Selected prompt source is empty."
    },
    videoGenerator: {
      referenceImageGeneratorTitle: "Create Reference Image (Optional)",
      referenceImageGeneratorDescription: "This will use the main prompt above to generate an image.",
      generateImageButton: "Generate Image",
      generatingImageButton: "Generating...",
      addImageButton: "Add to References",
    },
    tutorial: {
        title: "Application Tutorial",
        textTutorial: "Text Tutorial",
        videoTutorial: "Video Tutorial",
        intro: "Welcome to the AL ANSHOR VEO GENERATOR! This guide will walk you through creating amazing videos from start to finish.",
        setup: {
            title: "1. Initial Setup: API Keys",
            body: "The application requires two types of API keys to function. You can manage them by clicking the key buttons in the header: <br/>- <strong>Story API Key:</strong> Used for all text-based generation (storyboards, publishing kits). {You can use a free Gemini API account} <br/>- <strong>Video & Thumbnail API Key:</strong> Used to generate the final video and thumbnail images. {You must use a paid Gemini API / Google Cloud Project account} <br/>You must add at least one valid key for each type and set one as 'active' to begin.<br/><a href=\"https://console.cloud.google.com/marketplace/product/google/generativelanguage.googleapis.com?q=search&referrer=search&hl=en&project=gen-lang-client-0742835952\" class=\"text-amber-400 hover:underline\" target=\"_blank\" rel=\"noopener noreferrer\">Click here to get an API Key</a>"
        },
        story: {
            title: "2. Creating Your Story",
            intro: "Everything begins in the 'Story Editor' tab.",
            step1: "<strong>Character Creation (Optional):</strong> Use the 'Character Garage' to define your characters. This ensures they look consistent across all scenes.",
            step2: "<strong>Write Your Script:</strong> Fill in the 'Story Title' and 'Story Script / Summary' fields. Or, use the 'Smart Director' to get AI-generated ideas instantly!",
            step3: "<strong>Direct the Scene:</strong> Use the 'Directing Desk' to set the mood, location, weather, and camera style for your story.",
            step4: "<strong>Generate Storyboard:</strong> Once your script and settings are ready, click 'Create Storyboard!'."
        },
        storyboard: {
            title: "3. Developing Scenes",
            intro: "The 'Storyboard' tab shows a scene-by-scene breakdown of your story.",
            step1: "<strong>Generate Prompts:</strong> For each scene, click 'Design Blueprint' and then 'Create Cinematic Prompt'. The cinematic prompt is a detailed instruction for the video AI.",
            step2: "<strong>Proceed to Video Generation:</strong> When you're happy with a 'Cinematic Prompt', click 'Generate Video with this Prompt' to move to the next stage."
        },
        video: {
            title: "4. Generating the Video",
            body: "You are now in the Video Generator. The cinematic prompt is pre-filled. Adjust options like 'Aspect Ratio' or add a 'Reference Image' if needed. Click 'Generate Video' and be patient—this can take several minutes. Once complete, you can watch and download your video."
        },
        publishing: {
            title: "5. Publishing Your Content",
            intro: "After creating your video, it's time to prepare it for upload.",
            step1: "<strong>Generate Publishing Kit:</strong> Go back to the Story Creator. In the sidebar, click 'Create Everything!' inside the 'Magic Broadcast Kit' section. This generates YouTube titles, descriptions, tags, and thumbnail concepts.",
            step2: "<strong>Create Thumbnails:</strong> Switch to the 'Publishing Kit' tab. Here you can generate stunning thumbnails based on AI concepts, add text overlays, and even localize all your text assets for different languages before copying them for your upload."
        },
        closeButton: "Got it, let's create!"
    },
    storyCreator: {
      newStory: "New Story",
      characterGarage: "Character Garage",
      garageDescription: "Register your favorite toys here to make them the main star!",
      openCharacterWorkshop: "Open Character Workshop",
      garageEmpty: "Your dream garage is empty.",
      directingDesk: "Directing Desk",
      deskDescription: "Additional settings for your story.",
      sceneSet: "Scene Set:",
      locationSet: "Main Location Set:",
      weatherSet: "Weather & Atmosphere Set:",
      cameraStyleSet: "Camera Style (POV):",
      narratorLanguageSet: "Narrator Language Set:",
      timeOfDay: "Time of Day:",
      artStyle: "Art Style / Visual Mood:",
      soundtrackMood: "Soundtrack Mood:",
      pacing: "Scene Pacing:",
      customSceneStylePlaceholder: "e.g., A funny cooking show scene",
      customLocationPlaceholder: "e.g., Giant Kitchen Diorama",
      customWeatherPlaceholder: "e.g., Magical aurora in the sky",
      customCameraStylePlaceholder: "e.g., Spy movie style tracking shot",
      customLanguagePlaceholder: "e.g., Sundanese",
      storyEditor: "Story Editor",
      storyboard: "Storyboard",
      publishingKit: "Publishing Kit",
      haveIdea: "Already Have a Story Idea?",
      ideaDescriptionDirect: "Go directly to the video generator to bring your idea to life!",
      openDirectVideo: "Create Video Directly",
      needIdea: "Need a Story Idea?",
      ideaDescription: "Use the Smart Director to create a ready-to-air script outline!",
      openSmartDirector: "Open Smart Director",
      ideaWithReference: "Create Idea With Reference",
      ideaWithReferenceDescription: "Upload videos or photos for the AI to analyze into a story idea and cinematic prompt.",
      openReferenceIdea: "Analyze References",
      createAffiliateVideo: "Create Affiliate Video",
      storyTitle: "Story Title:",
      storyTitlePlaceholder: "e.g., Rino the Red Racing Car and Goro the Brave Monster Truck",
      storyScript: "Story Script / Summary:",
      storyScriptPlaceholder: "Write a story summary or main idea here. The AI will develop it into professional scenes.",
      sceneCount: "Number of Scenes:",
      createStoryboard: "Create Storyboard!",
      storyboardPlaceholderTitle: "Your Story Results Will Appear Here",
      storyboardPlaceholderDescription: "Click 'Create Storyboard!' to begin.",
      scene: "Scene",
      cinematography: "Cinematography",
      soundEffects: "Sound Effects",
      noSfx: "No SFX suggestions.",
      mixingGuide: "Smart Mixing Guide",
      generateBlueprint: "Design Blueprint",
      generateCinematicPrompt: "Create Cinematic Prompt",
      useThisPrompt: "Generate Video with this Prompt",
      resultBlueprint: "Result: Blueprint Design",
      resultCinematic: "Result: Cinematic Prompt",
      error: "Error",
      confirmNewStoryTitle: "Start a New Story?",
      confirmNewStoryMessage: "All current progress will be deleted. Are you sure?",
      directingOptions: {
        sceneSet: { 
          standard_cinematic: "Standard Cinematic Adventure", 
          epic_destruction: "Epic Destruction (Slow-Motion)", 
          drifting_precision: "Drifting Precision Challenge",
          comedic_chase: "Comedic Chase Scene",
          tense_standoff: "Tense Standoff",
          mysterious_discovery: "Mysterious Discovery",
          custom_scene: "Type your own scene set..."
        },
        locationSet: { 
          standardLandGroup: "🏞️ Standard & Land Sets", 
          natural_outdoor: "Outdoors (Garden/Yard)", 
          kids_bedroom: "Kid's Bedroom",
          city_streets: "City Streets (Urban)",
          enchanted_forest: "Enchanted Forest",
          futuristic_lab: "Futuristic Lab",
          custom_location: "Type your own location..." 
        },
        weatherSet: { 
          sunny: "Bright Sunny", 
          cloudy: "Cloudy", 
          rainy: "Rainy with Thunder",
          misty_fog: "Misty Fog",
          magical_twilight: "Magical Twilight",
          post_apocalyptic_dust: "Post-Apocalyptic Dust",
          custom_weather: "Type your own atmosphere..."
        },
        cameraStyleSet: { 
          standardGroup: "🎥 Standard Styles", 
          standard_cinematic: "Standard Cinematic", 
          fpv_drone_dive: "FPV Drone Dive",
          handheld_shaky: "Handheld (Shaky Cam)",
          slow_dolly_zoom: "Slow Dolly Zoom (Vertigo)",
          stationary_asmr: "Stationary (ASMR/Relaxation)",
          custom_camera: "Type your own camera style..."
        },
        narratorLanguageSet: { 
          no_narrator: "Without Narrator", 
          id: "Indonesian", 
          en: "English", 
          es: "Spanish",
          zh: "Chinese (Mandarin)",
          hi: "Hindi",
          ar: "Arabic",
          pt: "Portuguese",
          ru: "Russian",
          ja: "Japanese",
          de: "German",
          fr: "French",
          custom_language: "Type your own language..."
        },
        timeOfDay: {
            default: "Default (Based on story)",
            golden_hour: "Golden Hour (Sunset)",
            midday: "Bright Midday",
            blue_hour: "Blue Hour (Twilight)",
            night: "Pitch Black Night"
        },
        artStyle: {
            hyper_realistic: "Hyper-realistic",
            vintage_film: "Vintage Film (80s look)",
            anime_inspired: "Anime Inspired",
            gritty_noir: "Gritty Noir",
            dreamlike_fantasy: "Dreamlike & Fantasy"
        },
        soundtrackMood: {
            none: "No Music (Ambience Only)",
            epic_orchestral: "Epic Orchestral",
            tense_suspenseful: "Tense & Suspenseful",
            upbeat_cheerful: "Upbeat & Cheerful",
            lofi_relaxing: "Lo-fi & Relaxing"
        },
        pacing: {
            normal: "Normal Pace",
            slow_deliberate: "Very Slow (Deliberate)",
            fast_action: "Fast-Paced (Action)",
            frenetic_chaotic: "Frenetic (Chaotic)"
        }
      },
       publishingKitSection: {
        title: "Metadata Generator",
        description: "The story is ready! Now, create all the assets for uploading to YouTube with one click.",
        generateButton: "Create Everything!",
        generatingButton: "Creating...",
        apiKeyInstruction: "Please ensure both Story and Video & Thumbnail API Keys are set to proceed."
      },
    },
    characterWorkshop: {
        title: "Character Workshop",
        subtitle: "Create a new digital twin for your toy or edit an existing one.",
        aiAssistantSection: "AI Assistant",
        aiAssistantDescription: "No time to type? Upload reference images or videos, describe an idea, then click 'Design with AI' to auto-fill the details.",
        uploadButton: "Add References",
        fileTypes: "Images & Videos (10s max, 25MB)",
        ideaPlaceholder: "Describe your toy or provide extra details...",
        designWithAiButton: "✨ Design with AI",
        designingWithAiButton: "Designing...",
        modelDetailsSection: "Model Details (Identity & Character)",
        brandName: "Fictional Brand Name:",
        modelName: "Specific Model Name:",
        consistencyId: "Consistency ID (Unique Token):",
        consistencyIdHint: "A unique ID used in prompts to maintain character consistency.",
        mainMaterial: "Main Material:",
        designLanguage: "Brand Design Language:",
        keyFeatures: "Key Features (Visual DNA):",
        keyFeaturesPlaceholder: "Add a feature & press Enter...",
        actionDnaSection: "Action DNA",
        actionDnaDescription: "What can this character do? (e.g., 'jumps high', 'drifts smoothly')",
        actionDnaPlaceholder: "Add an action & press Enter...",
        characterPersonality: "Character Personality:",
        personalityPlaceholder: "Describe traits, e.g., cheerful, brave, grumpy...",
        physicalDetails: "Nuanced Physical Details:",
        physicalDetailsPlaceholder: "e.g., Slightly worn paint on left fender, glowing blue eyes...",
        scaleAndSize: "Scale & Size:",
        scaleAndSizePlaceholder: "e.g., 1:64 scale, palm-sized, as big as a cat...",
        saveButton: "Save Character",
        updateButton: "Update Character",
        alertUploadOrDescribe: "Please upload at least one image/video or describe your toy to use the AI Assistant.",
        alertRequiredFields: "Brand Name, Model Name, and Consistency ID are required to save."
    },
    smartDirector: {
      title: "Smart Director",
      step1Description: "Let's create a ready-to-air script outline! Follow these easy steps.",
      step1Label: "Step 1: Choose Content Format",
      step2Label: "Step 2: Choose Main Character",
      step3Label: "Step 3: Choose Story Theme",
      generateIdeasButton: "Give me 3 Ideas!",
      generatingIdeasButton: "Thinking...",
      step2Title: "Choose Your Favorite Script Idea!",
      step3Title: "Finalize Your Story",
      tryAgainButton: "↻ Request New Ideas",
      applyIdeaButton: "✅ Use This Idea!",
      cancelButton: "Cancel",
      contentFormats: {
        cinematic_adventure: "Cinematic Adventure & Story",
        product_review: "Product Review",
        unboxing: "Unboxing & First Impressions",
        vs_challenge: "Comparison Video (VS Challenge)",
        asmr: "ASMR",
        tutorial: "Tutorial / How-to",
        educational: "Educational / Informative",
        vlog: "Day in the Life / Vlog",
        top_list: "Top 10 / List",
        challenge: "Challenge Video",
        myth_busting: "Myth Busting",
        custom_format: "Type your own format...",
      },
      customFormatPlaceholder: "e.g., Stop Motion Cooking",
      characterOptions: {
        random: "Choose Randomly",
        yourGarage: "🚗 Your Garage",
      },
      themeOptions: {
        placeholder_loading: "Getting AI suggestions...",
        placeholder_select: "First, select a format and character...",
        custom_theme: "Type your own theme...",
      },
      customThemePlaceholder: "e.g., Racing on Planet Mars"
    },
     referenceIdeaModal: {
      title: "Create Idea from Reference",
      description: "Upload one or more reference images or videos. The AI will analyze them to generate a detailed cinematic prompt.",
      uploadArea: "Upload files",
      analyzeButton: "Analyze & Generate Prompts",
      analyzingButton: "Analyzing...",
      resultsTitle: "AI Analysis Results",
      simplePromptLabel: "Simple Cinematic Prompt",
      jsonPromptLabel: "Detailed JSON Prompt",
      useSimplePromptButton: "Generate Video with Simple Prompt",
      useJsonPromptButton: "Generate Video with JSON Prompt",
      placeholder: "Upload reference media and click 'Analyze' to see results here."
    },
    affiliateCreator: {
        title: "Affiliate Video Creator",
        description: "Generate a consistent set of images for your affiliate content.",
        uploadSectionTitle: "1. Upload Product",
        settingsSectionTitle: "Generation Settings",
        numberOfImages: "Number of Images to Generate",
        generateButton: "Generate Image Sequence",
        generatingButton: "Generating...",
        resultsSectionTitle: "3. Generated Images",
        resultsPlaceholder: "Your generated images will appear here.",
        regenerate: "Regenerate",
        replace: "Replace",
        generateVideo: "Generate Video",
        download: "Download",
        modelSectionTitle: "2. Choose Model",
        modelWoman: "Woman",
        modelMan: "Man",
        modelNone: "Without Model",
        vibeSectionTitle: "3. Choose Content Vibe",
        customVibePlaceholder: "Describe your custom vibe...",
        vibes: {
            cafe_aesthetic: "Cafe Aesthetic",
            urban_night: "Urban Style (Night)",
            tropical_beach: "Tropical Beach",
            luxury_apartment: "Luxury Apartment",
            flower_garden: "Flower Garden",
            old_building: "Old Building",
            classic_library: "Classic Library",
            minimalist_studio: "Minimalist Studio",
            rooftop_bar: "Rooftop Bar",
            autumn_park: "Autumn Park",
            tokyo_street: "Tokyo Street",
            scandinavian_interior: "Scandinavian Interior",
            custom: "Custom...",
        }
    }
  };

const idTranslations: Translations = {
    appName: "AL ANSHOR VEO GENERATOR",
    appTagline: "Hasilkan video menakjubkan dari teks atau gambar.",
    manageStoryApiKeys: "Kunci API Cerita",
    manageVideoApiKeys: "Kunci API Video & Thumbnail",
    settingsButton: "Pengaturan",
    tutorialButton: "Tutorial",
    promptLabel: "Prompt",
    promptPlaceholder: "Seekor singa agung memandangi sabana saat matahari terbenam...",
    promptHint: "Anda bisa menggunakan teks biasa atau string format JSON.",
    referenceImageLabel: "Gambar Referensi (Opsional)",
    uploadFile: "Unggah file",
    dragAndDrop: "atau seret dan lepas",
    fileTypes: "PNG, JPG, GIF hingga 10MB",
    generationSettings: "Pengaturan Generasi",
    aspectRatioLabel: "Rasio Aspek",
    soundLabel: "Suara",
    enableSound: "Aktifkan suara",
    resolutionLabel: "Resolusi",
    videoKeyMissingWarning: "Silakan tambah Kunci API Video profesional untuk memulai.",
    generateButton: "Hasilkan Video",
    generatingButton: "Menghasilkan Video...",
    loaderTitle: "Menghasilkan Video Anda",
    loadingMessages: [ "Menginisialisasi model VEO...", "Menganalisisis prompt Anda...", "Menyusun adegan utama...", "Menghasilkan bingkai awal...", "Merender urutan video... ini mungkin memakan waktu beberapa menit.", "Meningkatkan skala ke resolusi tinggi...", "Menambahkan suara dan sentuhan akhir...", "Hampir selesai, menyiapkan file video akhir." ],
    playerTitle: "Pembuatan Selesai!",
    downloadButton: "Unduh Video",
    storyApiKeyManagerTitle: "Kunci API Cerita",
    videoApiKeyManagerTitle: "Kunci API Video & Thumbnail Profesional",
    addNewStoryKeyLabel: "Tambah Kunci API Cerita Baru",
    addNewVideoKeyLabel: "Tambah Kunci API Video & Thumbnail Profesional Baru",
    apiKeyInputPlaceholder: "Masukkan Kunci API Gemini Anda",
    addKeyButton: "Tambah Kunci",
    validatingButton: "Memvalidasi...",
    savedStoryKeysLabel: "Kunci Cerita Tersimpan",
    savedVideoKeysLabel: "Kunci Video & Thumbnail Profesional Tersimpan",
    noKeysSaved: "Tidak ada Kunci API yang tersimpan.",
    addKeyPrompt: "Tambahkan kunci di atas untuk memulai.",
    closeButton: "Tutup",
    errorKeyEmpty: "Kunci API tidak boleh kosong.",
    errorKeyExists: "Kunci API ini sudah ditambahkan.",
    errorKeyInvalid: "Kunci API tidak valid atau masalah jaringan. Harap periksa kunci dan coba lagi.",
    generationFailed: "Pembuatan Gagal",
    errorRateLimit: "Layanan sedang sibuk karena permintaan tinggi. Harap tunggu sejenak dan coba lagi.",
    alertEnterPrompt: "Silakan masukkan prompt.",
    alertSetStoryApiKey: "Silakan atur Kunci API Cerita yang aktif sebelum melanjutkan.",
    alertSetVideoApiKey: "Silakan atur Kunci API Video & Thumbnail Profesional yang aktif sebelum membuat video.",
    alertSetVideoThumbnailApiKey: "Silakan atur Kunci API Video & Thumbnail yang aktif sebelum membuat thumbnail.",
    backToStoryboard: "Kembali ke Papan Cerita",
    confirmButton: "OKE",
    revalidateAllButton: "Validasi Ulang Semua",
    apiKeyStatuses: {
      valid: "VALID",
      invalid: "TIDAK VALID",
      checking: "MEMERIKSA...",
      unchecked: "BELUM DICEK"
    },
    publishingKit: {
      copyButton: "Salin",
      copiedButton: "Tersalin!",
      aspectRatioLabel: "Rasio Aspek:",
      generateThumbnailButton: "Buat Thumbnail",
      generatingThumbnailButton: "Membuat...",
      downloadButton: "Unduh",
      thumbnailIdea: "Ide Thumbnail",
      simpleImagePrompt: "Prompt Gambar Sederhana",
      advancedJsonPrompt: "Prompt JSON Lanjutan",
      promptSource: "Sumber Prompt",
      promptSourceSimple: "Prompt Sederhana",
      promptSourceAdvanced: "Prompt JSON Lanjutan",
      targetLanguageRegion: "Target Bahasa & Wilayah",
      generatingAssetsFor: "Membuat aset untuk",
      errorJsonParse: "Error: Tidak dapat mem-parsing JSON dari AI.",
      errorCaptionMissing: "Teks untuk overlay thumbnail tidak ditemukan.",
      errorConceptMissing: "Konsep thumbnail tidak ditemukan.",
      errorPromptEmpty: "Sumber prompt yang dipilih kosong."
    },
    videoGenerator: {
      referenceImageGeneratorTitle: "Buat Gambar Referensi (Opsional)",
      referenceImageGeneratorDescription: "Ini akan menggunakan prompt utama di atas untuk menghasilkan gambar.",
      generateImageButton: "Generate Gambar",
      generatingImageButton: "Membuat...",
      addImageButton: "Tambahkan ke Referensi",
    },
    tutorial: {
        title: "Tutorial Aplikasi",
        textTutorial: "Tutorial Dengan Teks",
        videoTutorial: "Tutorial Dengan Video",
        intro: "Selamat datang di AL ANSHOR VEO GENERATOR! Panduan ini akan memandu Anda membuat video luar biasa dari awal hingga akhir.",
        setup: {
            title: "1. Pengaturan Awal: Kunci API",
            body: "Aplikasi ini memerlukan dua jenis kunci API untuk berfungsi. Anda dapat mengelolanya dengan mengklik tombol kunci di header: <br/>- <strong>Kunci API Cerita:</strong> Digunakan untuk semua pembuatan berbasis teks (papan cerita, kit siaran). {Bisa menggunakan akun API Gemini Gratisan} <br/>- <strong>Kunci API Video & Thumbnail:</strong> Digunakan untuk menghasilkan video final dan gambar thumbnail. { Harus menggunakan akun API Gemini Berbayar/Consoleskillboost} <br/>Anda harus menambahkan setidaknya satu kunci yang valid untuk setiap jenis dan menetapkannya sebagai 'aktif' untuk memulai.<br/><a href=\"https://console.cloud.google.com/marketplace/product/google/generativelanguage.googleapis.com?q=search&referrer=search&hl=id&project=gen-lang-client-0742835952\" class=\"text-amber-400 hover:underline\" target=\"_blank\" rel=\"noopener noreferrer\">Klik disini untuk mendapatkan API</a>"
        },
        story: {
            title: "2. Membuat Cerita Anda",
            intro: "Semuanya dimulai di tab 'Editor Cerita'.",
            step1: "<strong>Pembuatan Karakter (Opsional):</strong> Gunakan 'Garasi Impianmu' untuk mendefinisikan karakter Anda. Ini memastikan mereka terlihat konsisten di semua adegan.",
            step2: "<strong>Tulis Naskah Anda:</strong> Isi kolom 'Judul Cerita' dan 'Naskah Cerita / Ringkasan'. Atau, gunakan 'Sutradara Cerdas' untuk mendapatkan ide yang dihasilkan AI secara instan!",
            step3: "<strong>Arahkan Adegan:</strong> Gunakan 'Meja Bermain' untuk mengatur suasana, lokasi, cuaca, dan gaya kamera untuk cerita Anda.",
            step4: "<strong>Buat Papan Cerita:</strong> Setelah naskah dan pengaturan Anda siap, klik 'Buat Papan Cerita!'."
        },
        storyboard: {
            title: "3. Mengembangkan Adegan",
            intro: "Tab 'Papan Cerita' menunjukkan rincian adegan demi adegan dari cerita Anda.",
            step1: "<strong>Hasilkan Prompt:</strong> Untuk setiap adegan, klik 'Rancang Blueprint' lalu 'Buat Prompt Sinematik'. Prompt sinematik adalah instruksi terperinci untuk AI video.",
            step2: "<strong>Lanjutkan ke Pembuatan Video:</strong> Ketika Anda puas dengan 'Prompt Sinematik', klik 'Hasilkan Video dengan Prompt Ini' untuk melanjutkan ke tahap berikutnya."
        },
        video: {
            title: "4. Menghasilkan Video",
            body: "Anda sekarang berada di Generator Video. Prompt sinematik sudah terisi sebelumnya. Sesuaikan opsi seperti 'Rasio Aspek' atau tambahkan 'Gambar Referensi' jika perlu. Klik 'Hasilkan Video' dan bersabarlah—ini bisa memakan waktu beberapa menit. Setelah selesai, Anda dapat menonton dan mengunduh video Anda."
        },
        publishing: {
            title: "5. Menerbitkan Konten Anda",
            intro: "Setelah membuat video Anda, saatnya menyiapkannya untuk diunggah.",
            step1: "<strong>Hasilkan Kit Publikasi:</strong> Kembali ke Pembuat Cerita. Di sidebar, klik 'Buatkan Semuanya!' di dalam bagian 'Kit Siaran Ajaib'. Ini menghasilkan judul YouTube, deskripsi, tag, dan ide thumbnail.",
            step2: "<strong>Buat Thumbnail:</strong> Beralih ke tab 'Kit Siaran'. Di sini Anda dapat menghasilkan thumbnail yang menakjubkan berdasarkan konsep AI, menambahkan teks overlay, dan bahkan melokalkan semua aset teks Anda untuk bahasa yang berbeda sebelum menyalinnya untuk diunggah."
        },
        closeButton: "Mengerti, ayo buat!"
    },
    storyCreator: {
      newStory: "Cerita Baru",
      characterGarage: "Garasi Impianmu",
      garageDescription: "Daftarkan mainan favoritmu di sini untuk menjadikannya bintang utama!",
      openCharacterWorkshop: "Buka Bengkel Karakter",
      garageEmpty: "Garasi impianmu masih kosong.",
      directingDesk: "Meja Bermain",
      deskDescription: "Pengaturan tambahan untuk cerita Anda.",
      sceneSet: "Set Adegan:",
      locationSet: "Set Lokasi Utama:",
      weatherSet: "Set Cuaca & Suasana:",
      cameraStyleSet: "Gaya Kamera (POV):",
      narratorLanguageSet: "Set Bahasa Narator:",
      timeOfDay: "Waktu:",
      artStyle: "Gaya Seni / Suasana Visual:",
      soundtrackMood: "Suasana Soundtrack:",
      pacing: "Tempo Adegan:",
      customSceneStylePlaceholder: "Contoh: Adegan acara masak yang lucu",
      customLocationPlaceholder: "Contoh: Diorama Dapur Raksasa",
      customWeatherPlaceholder: "Contoh: Aurora magis di langit",
      customCameraStylePlaceholder: "Contoh: Gaya film mata-mata",
      customLanguagePlaceholder: "Contoh: Bahasa Sunda",
      storyEditor: "Editor Cerita",
      storyboard: "Papan Cerita",
      publishingKit: "Kit Siaran",
      haveIdea: "Sudah Punya Ide Cerita?",
      ideaDescriptionDirect: "Langsung ke generator video untuk mewujudkan ide Anda.",
      openDirectVideo: "Langsung Buat Video",
      needIdea: "Butuh Ide Cerita?",
      ideaDescription: "Gunakan Sutradara Cerdas untuk membuat kerangka naskah yang siap tayang!",
      openSmartDirector: "Buka Sutradara Cerdas",
      ideaWithReference: "Buat Ide Dengan Referensi",
      ideaWithReferenceDescription: "Unggah video atau foto untuk dianalisa oleh AI menjadi ide cerita dan prompt sinematik.",
      openReferenceIdea: "Analisa Referensi",
      createAffiliateVideo: "Buat Video Affiliate",
      storyTitle: "Judul Cerita:",
      storyTitlePlaceholder: "Contoh: Rino si Mobil Balap Merah dan Goro si Truk Monster Pemberani",
      storyScript: "Naskah Cerita / Ringkasan:",
      storyScriptPlaceholder: "Tulis ringkasan cerita atau ide utama di sini. AI akan mengembangkannya menjadi adegan-adegan profesional.",
      sceneCount: "Jumlah Adegan:",
      createStoryboard: "Buat Papan Cerita!",
      storyboardPlaceholderTitle: "Hasil Ceritamu Akan Muncul di Sini",
      storyboardPlaceholderDescription: "Klik \"Buat Papan Cerita!\" untuk memulai.",
      scene: "Adegan",
      cinematography: "Sinematografi",
      soundEffects: "Efek Suara",
      noSfx: "Tidak ada saran SFX.",
      mixingGuide: "Panduan Mixing Cerdas",
      generateBlueprint: "Rancang Blueprint",
      generateCinematicPrompt: "Buat Prompt Sinematik",
      useThisPrompt: "Hasilkan Video dengan Prompt Ini",
      resultBlueprint: "Hasil: Rancang Blueprint",
      resultCinematic: "Hasil: Prompt Sinematik",
      error: "Error",
      confirmNewStoryTitle: "Mulai Cerita Baru?",
      confirmNewStoryMessage: "Semua progres saat ini akan dihapus. Anda yakin?",
      directingOptions: {
        sceneSet: { 
          standard_cinematic: "Petualangan Sinematik Standar", 
          epic_destruction: "Kehancuran Epik (Slow-Motion)", 
          drifting_precision: "Tantangan Presisi Drifting",
          comedic_chase: "Adegan Kejar-kejaran Komedi",
          tense_standoff: "Konfrontasi Tegang",
          mysterious_discovery: "Penemuan Misterius",
          custom_scene: "Ketik Set Adegan Sendiri..."
        },
        locationSet: { 
          standardLandGroup: "🏞️ Set Standar & Darat", 
          natural_outdoor: "Luar Ruangan (Taman/Halaman)", 
          kids_bedroom: "Kamar Tidur Anak",
          city_streets: "Jalanan Kota (Perkotaan)",
          enchanted_forest: "Hutan Ajaib",
          futuristic_lab: "Laboratorium Futuristik",
          custom_location: "Ketik Lokasi Sendiri..." 
        },
        weatherSet: { 
          sunny: "Cerah Terik", 
          cloudy: "Berawan", 
          rainy: "Hujan dengan Petir",
          misty_fog: "Kabut Misterius",
          magical_twilight: "Senja Ajaib",
          post_apocalyptic_dust: "Debu Pasca-Apokaliptik",
          custom_weather: "Ketik Suasana Sendiri..."
        },
        cameraStyleSet: { 
          standardGroup: "🎥 Gaya Standar", 
          standard_cinematic: "Sinematik Standar", 
          fpv_drone_dive: "FPV Drone Dive",
          handheld_shaky: "Handheld (Kamera Goyang)",
          slow_dolly_zoom: "Slow Dolly Zoom (Efek Vertigo)",
          stationary_asmr: "Statis (ASMR/Relaksasi)",
          custom_camera: "Ketik Gaya Sendiri..."
        },
        narratorLanguageSet: { 
          no_narrator: "Tanpa Narator", 
          id: "Bahasa Indonesia", 
          en: "English (Bahasa Inggris)", 
          es: "Español (Bahasa Spanyol)",
          zh: "中文 (Bahasa Mandarin)",
          hi: "हिन्दी (Bahasa Hindi)",
          ar: "العربية (Bahasa Arab)",
          pt: "Português (Bahasa Portugis)",
          ru: "Русский (Bahasa Rusia)",
          ja: "日本語 (Bahasa Jepang)",
          de: "Deutsch (Bahasa Jerman)",
          fr: "Français (Bahasa Prancis)",
          custom_language: "Ketik Bahasa Sendiri..."
        },
        timeOfDay: {
            default: "Default (Sesuai Cerita)",
            golden_hour: "Golden Hour (Matahari Terbenam)",
            midday: "Siang Hari Terik",
            blue_hour: "Blue Hour (Senja)",
            night: "Malam Gelap Gulita"
        },
        artStyle: {
            hyper_realistic: "Sangat Realistis (Hyper-realistic)",
            vintage_film: "Film Antik (Tampilan 80-an)",
            anime_inspired: "Terinspirasi Anime",
            gritty_noir: "Film Noir Kelam",
            dreamlike_fantasy: "Fantasi Seperti Mimpi"
        },
        soundtrackMood: {
            none: "Tanpa Musik (Hanya Suara Latar)",
            epic_orchestral: "Orkestra Epik",
            tense_suspenseful: "Tegang & Penuh Ketegangan",
            upbeat_cheerful: "Ceria & Semangat",
            lofi_relaxing: "Lo-fi & Santai"
        },
        pacing: {
            normal: "Tempo Normal",
            slow_deliberate: "Sangat Lambat (Sengaja)",
            fast_action: "Tempo Cepat (Aksi)",
            frenetic_chaotic: "Kacau (Frenetic)"
        }
      },
       publishingKitSection: {
        title: "Mesin Penghasil Metadata",
        description: "Cerita sudah siap! Sekarang, buat semua aset untuk diunggah ke YouTube dengan satu klik.",
        generateButton: "Buatkan Semuanya!",
        generatingButton: "Membuat...",
        apiKeyInstruction: "Pastikan Kunci API Cerita dan Kunci API Video & Thumbnail sudah diatur untuk melanjutkan."
      },
    },
    characterWorkshop: {
        title: "Bengkel Karakter",
        subtitle: "Buat kembaran digital baru untuk mainan Anda atau edit yang sudah ada.",
        aiAssistantSection: "Asisten AI",
        aiAssistantDescription: "Tidak ada waktu untuk mengetik? Unggah gambar atau video referensi, jelaskan ide, lalu klik 'Desain dengan AI' untuk mengisi detail secara otomatis.",
        uploadButton: "Tambah Referensi",
        fileTypes: "Gambar & Video (maks 10d, 25MB)",
        ideaPlaceholder: "Jelaskan mainan Anda atau berikan detail tambahan...",
        designWithAiButton: "✨ Desain dengan AI",
        designingWithAiButton: "Mendesain...",
        modelDetailsSection: "Detail Model (Identitas & Karakter)",
        brandName: "Nama Merek Fiktif:",
        modelName: "Nama Model Spesifik:",
        consistencyId: "ID Konsistensi (Token Unik):",
        consistencyIdHint: "ID unik yang digunakan dalam prompt untuk menjaga konsistensi karakter.",
        mainMaterial: "Material Utama:",
        designLanguage: "Bahasa Desain Merek:",
        keyFeatures: "Fitur Kunci (DNA Visual):",
        keyFeaturesPlaceholder: "Tambah fitur & tekan Enter...",
        actionDnaSection: "DNA Aksi",
        actionDnaDescription: "Apa yang bisa dilakukan karakter ini? (contoh: 'lompat tinggi', 'drifting mulus')",
        actionDnaPlaceholder: "Tambah aksi & tekan Enter...",
        characterPersonality: "Kepribadian Karakter:",
        personalityPlaceholder: "Jelaskan sifat karakter, cth: ceria, pemberani, pemarah...",
        physicalDetails: "Detail Fisik Nuansa:",
        physicalDetailsPlaceholder: "cth: Cat sedikit usang di fender kiri, mata biru menyala...",
        scaleAndSize: "Skala & Ukuran:",
        scaleAndSizePlaceholder: "cth: Skala 1:64, seukuran telapak tangan, sebesar kucing...",
        saveButton: "Simpan Karakter",
        updateButton: "Perbarui Karakter",
        alertUploadOrDescribe: "Harap unggah setidaknya satu gambar/video atau jelaskan mainan Anda untuk menggunakan Asisten AI.",
        alertRequiredFields: "Nama Merek, Nama Model, dan ID Konsistensi wajib diisi untuk menyimpan."
    },
    smartDirector: {
      title: "Sutradara Cerdas",
      step1Description: "Ayo kita buat kerangka naskah yang siap tayang! Ikuti langkah-langkah mudah ini.",
      step1Label: "Langkah 1: Pilih Format Konten",
      step2Label: "Langkah 2: Pilih Karakter Utama",
      step3Label: "Langkah 3: Pilih Tema Cerita",
      generateIdeasButton: "Berikan 3 Ide!",
      generatingIdeasButton: "Mencari Ide...",
      step2Title: "Pilih Ide Naskah Favoritmu!",
      step3Title: "Finalisasi Ceritamu",
      tryAgainButton: "↻ Minta Ide Baru",
      applyIdeaButton: "✅ Pakai Ide Ini!",
      cancelButton: "Batal",
      contentFormats: {
        cinematic_adventure: "Petualangan & Cerita Sinematik",
        product_review: "Ulasan Produk (Review)",
        unboxing: "Unboxing & Kesan Pertama",
        vs_challenge: "Video Perbandingan (VS Challenge)",
        asmr: "ASMR",
        tutorial: "Tutorial / Panduan",
        educational: "Edukasi / Informatif",
        vlog: "Vlog / Sehari-hari",
        top_list: "Daftar Top 10",
        challenge: "Video Tantangan",
        myth_busting: "Membongkar Mitos",
        custom_format: "Ketik Format Sendiri...",
      },
      customFormatPlaceholder: "Contoh: Memasak Stop Motion",
      characterOptions: {
        random: "Pilihkan Secara Acak",
        yourGarage: "🚗 Garasi Anda",
      },
      themeOptions: {
        placeholder_loading: "Meminta saran AI...",
        placeholder_select: "Pilih format dan karakter dulu...",
        custom_theme: "Ketik Tema Sendiri...",
      },
      customThemePlaceholder: "Contoh: Balapan di Planet Mars"
    },
    referenceIdeaModal: {
      title: "Buat Ide dari Referensi",
      description: "Unggah satu atau lebih gambar atau video referensi. AI akan menganalisisnya untuk menghasilkan prompt sinematik yang terperinci.",
      uploadArea: "Unggah file",
      analyzeButton: "Analisa & Hasilkan Prompt",
      analyzingButton: "Menganalisa...",
      resultsTitle: "Hasil Analisa AI",
      simplePromptLabel: "Prompt Sinematik Sederhana",
      jsonPromptLabel: "Prompt JSON Rinci",
      useSimplePromptButton: "Hasilkan Video dengan Prompt Sederhana",
      useJsonPromptButton: "Hasilkan Video dengan Prompt JSON",
      placeholder: "Unggah media referensi dan klik 'Analisa' untuk melihat hasilnya di sini."
    },
    affiliateCreator: {
        title: "Pembuat Video Afiliasi",
        description: "Hasilkan serangkaian gambar yang konsisten untuk konten afiliasi Anda.",
        uploadSectionTitle: "1. Unggah Produk",
        settingsSectionTitle: "Pengaturan Generasi",
        numberOfImages: "Jumlah Gambar untuk Dihasilkan",
        generateButton: "Hasilkan Urutan Gambar",
        generatingButton: "Menghasilkan...",
        resultsSectionTitle: "3. Gambar yang Dihasilkan",
        resultsPlaceholder: "Gambar yang Anda hasilkan akan muncul di sini.",
        regenerate: "Buat Ulang",
        replace: "Ganti",
        generateVideo: "Hasilkan Video",
        download: "Unduh",
        modelSectionTitle: "2. Pilih Model",
        modelWoman: "Wanita",
        modelMan: "Pria",
        modelNone: "Tanpa Model",
        vibeSectionTitle: "3. Pilih Vibe Konten",
        customVibePlaceholder: "Jelaskan vibe kustom Anda...",
        vibes: {
            cafe_aesthetic: "Kafe Estetik",
            urban_night: "Gaya Urban (Malam)",
            tropical_beach: "Pantai Tropis",
            luxury_apartment: "Apartemen Mewah",
            flower_garden: "Taman Bunga",
            old_building: "Gedung Tua",
            classic_library: "Perpustakaan Klasik",
            minimalist_studio: "Studio Minimalis",
            rooftop_bar: "Rooftop Bar",
            autumn_park: "Taman Musim Gugur",
            tokyo_street: "Jalanan Tokyo",
            scandinavian_interior: "Interior Skandinavia",
            custom: "Kustom...",
        }
    }
  };

// FIX: Removed self-referencing `esTranslations` in its own declaration.
const esTranslations: Translations = {
    ...enTranslations,
    affiliateCreator: {
        ...(enTranslations.affiliateCreator as Translations),
        modelNone: "Sin Modelo"
    }
};

// FIX: Removed self-referencing `zhTranslations` in its own declaration.
const zhTranslations: Translations = {
    ...enTranslations,
    affiliateCreator: {
        ...(enTranslations.affiliateCreator as Translations),
        modelNone: "无模特"
    }
};

// FIX: Removed self-referencing `hiTranslations` in its own declaration.
const hiTranslations: Translations = {
    ...enTranslations,
    affiliateCreator: {
        ...(enTranslations.affiliateCreator as Translations),
        modelNone: "बिना मॉडल के"
    }
};

// FIX: Removed self-referencing `arTranslations` in its own declaration.
const arTranslations: Translations = {
    ...enTranslations,
    affiliateCreator: {
        ...(enTranslations.affiliateCreator as Translations),
        modelNone: "بدون موديل"
    }
};

// FIX: Removed self-referencing `ptTranslations` in its own declaration.
const ptTranslations: Translations = {
    ...enTranslations,
    affiliateCreator: {
        ...(enTranslations.affiliateCreator as Translations),
        modelNone: "Sem Modelo"
    }
};

const bnTranslations: Translations = {
  ...enTranslations,
  appName: "আল আনশোর ভিইও জেনারেটর",
  appTagline: "টেক্সট বা ছবি থেকে অত্যাশ্চর্য ভিডিও তৈরি করুন।",
  manageStoryApiKeys: "গল্পের এপিআই কী",
  manageVideoApiKeys: "ভিডিও এবং থাম্বনেইল এপিআই কী",
  settingsButton: "সেটিংস",
  tutorialButton: "টিউটোরিয়াল",
  promptLabel: "প্রম্পট",
  promptPlaceholder: "সূর্যাস্তের সময় সাভানার দিকে তাকিয়ে থাকা এক মহিমান্বিত সিংহ...",
  promptHint: "আপনি সাধারণ টেক্সট বা JSON ফর্ম্যাটেড স্ট্রিং ব্যবহার করতে পারেন।",
  referenceImageLabel: "রেফারেন্স চিত্র (ঐচ্ছিক)",
  uploadFile: "একটি ফাইল আপলোড করুন",
  dragAndDrop: "অথবা টেনে আনুন",
  fileTypes: "PNG, JPG, GIF 10MB পর্যন্ত",
  affiliateCreator: {
    ...enTranslations.affiliateCreator as Translations,
    modelNone: "মডেল ছাড়া"
  }
};

const ruTranslations: Translations = { ...enTranslations, appName: "AL ANSHOR VEO GENERATOR (RU)", affiliateCreator: { ...enTranslations.affiliateCreator as Translations, modelNone: "Без модели" } };
const jaTranslations: Translations = { ...enTranslations, appName: "AL ANSHOR VEO GENERATOR (JA)", affiliateCreator: { ...enTranslations.affiliateCreator as Translations, modelNone: "モデルなし" } };
const deTranslations: Translations = { ...enTranslations, appName: "AL ANSHOR VEO GENERATOR (DE)", affiliateCreator: { ...enTranslations.affiliateCreator as Translations, modelNone: "Ohne Modell" } };
const frTranslations: Translations = { ...enTranslations, appName: "AL ANSHOR VEO GENERATOR (FR)", affiliateCreator: { ...enTranslations.affiliateCreator as Translations, modelNone: "Sans modèle" } };

const translations: { [key in Language]: Translations } = {
    en: enTranslations,
    id: idTranslations,
    es: esTranslations,
    zh: zhTranslations,
    hi: hiTranslations,
    ar: arTranslations,
    pt: ptTranslations,
    bn: bnTranslations,
    ru: ruTranslations,
    ja: jaTranslations,
    de: deTranslations,
    fr: frTranslations,
};

const getObjectProperty = (obj: any, path: string): string | string[] | Translations | undefined => {
    return path.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
};
  
const rtlLanguages: Language[] = ['ar'];

interface LanguageContextType {
    language: Language;
    setLanguage: (language: Language) => void;
    t: (key: string) => string | string[] | Translations;
    dir: 'ltr' | 'rtl';
}
  
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>(() => {
        try {
            const storedLang = localStorage.getItem(LANGUAGE_STORAGE_key) as Language;
            return storedLang && languageMap[storedLang] ? storedLang : 'en';
        } catch {
            return 'en';
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(LANGUAGE_STORAGE_key, language);
        } catch (e) {
            console.error("Failed to save language to localStorage", e);
        }
    }, [language]);
    
    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
    };

    const t = useCallback((key: string): string | string[] | Translations => {
        const langTranslations = translations[language] || translations.en;
        const translation = getObjectProperty(langTranslations, key);
        if (translation === undefined) {
            console.warn(`Translation not found for key: ${key} in language ${language}. Falling back to English.`);
            const fallback = getObjectProperty(translations.en, key);
            // Fallback for nested objects that might be missing in some languages
            if (fallback === undefined) {
                 console.error(`CRITICAL: Translation key "${key}" not found even in English fallback.`);
                 return key;
            }
            return fallback;
        }
        return translation;
    }, [language]);

    const dir: 'ltr' | 'rtl' = rtlLanguages.includes(language) ? 'rtl' : 'ltr';

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
        {children}
        </LanguageContext.Provider>
    );
};
  
export const useLocalization = (): LanguageContextType => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLocalization must be used within a LanguageProvider');
    }
    return context;
};
