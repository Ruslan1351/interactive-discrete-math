import { useEffect, useState } from 'preact/hooks';
import { ScAddr, ScClient, ScTemplate, ScType, ScHelper } from 'ts-sc-client';

export const SetTheoryViewer = () => {
  const client = new ScClient('ws://localhost:8090/ws_json');
  const helper = new ScHelper(client);
  const [currentPage, setCurrentPage] = useState(1);
  const [renderedHtml, setRenderedHtml] = useState('');
  const [language, setLanguage] = useState<'ru' | 'eng'>('ru');
  const [sectionTitle, setSectionTitle] = useState('');
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [parentSection, setParentSection] = useState<any>(null);
  const [currentScreen, setCurrentScreen] = useState<'sections'|'subsections'|'content'|'video'>('sections');
  const [sectionTree, setSectionTree] = useState<any>(null);
  const [sectionNames, setSectionNames] = useState<string[]>([]);

  async function fetchSection() {
    console.log('start section fetching...');
    const { subjectDomainOfSetTheory } = await client.searchKeynodes("subject_domain_of_set_theory");
    const { nrelSectionDecomposition } = await client.searchKeynodes("nrel_section_decomposition");

    async function buildSectionTree(sectionAddr) {
      const name = await helper.getMainIdentifier(sectionAddr, "lang_ru");
      const nameEng = await helper.getMainIdentifier(sectionAddr, "lang_en");
      const theory = await fetchTheory(sectionAddr);
      const engtheory = await fetchEngTheory(sectionAddr);
      const image = await fetchImage(sectionAddr);
      const video = await fetchVideo(sectionAddr);
      const subsections = await findSubsections(sectionAddr);
      const subsectionTrees = (await Promise.all(
      subsections.map(addr => buildSectionTree(addr))
    )).filter(subsection => 
      subsection.subsections?.length > 0 || subsection.theory || subsection.image
    );

    return {
      addr: sectionAddr,
      name,
      nameEng,
      subsections: subsectionTrees,
      theory: theory,
      engTheory: engtheory,
      image: image,
      video: video
    };
    }

    async function findSubsections(parentAddr) {
      const sectionAlias = "_section";
      const textAlias = "_text";
      const template = new ScTemplate();
      
      template.quintuple(
        [ScType.VarNode, sectionAlias],
        ScType.VarCommonArc,
        parentAddr,
        ScType.VarPermPosArc,
        nrelSectionDecomposition
      );
      template.triple(
        sectionAlias,
        ScType.VarPermPosArc,
        [ScType.VarNode, textAlias]
      );
      const res = await client.searchByTemplate(template);
      return res.map(item => item.get(textAlias));
    }

    const tree = await buildSectionTree(subjectDomainOfSetTheory);
    console.log('Section tree:', tree);
    return tree;
  }

  async function fetchTheory(specificSection) {
    console.log('start section theory fetching...');
    const { nrelScTextTranslation, langRu, nrelFormat, formatHtml } = await client.searchKeynodes("nrel_sc_text_translation", "lang_ru", "nrel_format", "format_html");
    console.log("Section address is equal to", specificSection);
    const translationAlias = "_translation";
    const textAlias = "_text";
    const template = new ScTemplate();
    template.quintuple(
      [ScType.VarNode, translationAlias],
      ScType.VarCommonArc,
      specificSection,
      ScType.VarPermPosArc,
      nrelScTextTranslation
    );
    template.triple(
      translationAlias,
      ScType.VarPermPosArc,
      [ScType.VarNodeLink, textAlias]
    );
    template.triple(
      langRu,
      ScType.VarPermPosArc,
      textAlias
    );
    template.quintuple(
      textAlias,
      ScType.VarCommonArc,
      formatHtml,
      ScType.VarPermPosArc,
      nrelFormat
    );
    const res = await client.searchByTemplate(template);
    if (!res.length) {
      console.log('Cannot find theory for section!');
      return null;
    }
    console.log("Theory fetched succesfully", res);
    const linkContent = (await client.getLinkContents([res[0].get(textAlias)]))[0];
    console.log("links content: ", linkContent._data);
    return linkContent._data;
  }
  
  async function fetchEngTheory(specificSection) {
    console.log('start eng section theory fetching...');
    const { nrelScTextTranslation, langEn, nrelFormat, formatHtml } = await client.searchKeynodes("nrel_sc_text_translation", "lang_en", "nrel_format", "format_html");
    console.log("Section address is equal to", specificSection);
    const translationAlias = "_translation";
    const textAlias = "_text";
    const template = new ScTemplate();
    template.quintuple(
      [ScType.VarNode, translationAlias],
      ScType.VarCommonArc,
      specificSection,
      ScType.VarPermPosArc,
      nrelScTextTranslation
    );
    template.triple(
      translationAlias,
      ScType.VarPermPosArc,
      [ScType.VarNodeLink, textAlias]
    );
    template.triple(
      langEn,
      ScType.VarPermPosArc,
      textAlias
    );
    template.quintuple(
      textAlias,
      ScType.VarCommonArc,
      formatHtml,
      ScType.VarPermPosArc,
      nrelFormat
    );
    const res = await client.searchByTemplate(template);
    if (!res.length) {
      console.log('Cannot find eng theory for section!');
      return null;
    }
    console.log("Eng theory fetched succesfully", res);
    const linkContent = (await client.getLinkContents([res[0].get(textAlias)]))[0];
    console.log("links content: ", linkContent._data);
    return linkContent._data;
  }
  
  async function fetchImage(specificSection) {
    console.log('start section image fetching...');
    const { nrelScTextTranslation, langRu, nrelFormat, formatJpg } = await client.searchKeynodes("nrel_sc_text_translation", "lang_ru", "nrel_format", "format_jpg");
    console.log("Section address is equal to", specificSection);
    const translationAlias = "_translation";
    const textAlias = "_text";
    const template = new ScTemplate();
    template.quintuple(
      [ScType.VarNode, translationAlias],
      ScType.VarCommonArc,
      specificSection,
      ScType.VarPermPosArc,
      nrelScTextTranslation
    );
    template.triple(
      translationAlias,
      ScType.VarPermPosArc,
      [ScType.VarNodeLink, textAlias]
    );
    template.triple(
      langRu,
      ScType.VarPermPosArc,
      textAlias
    );
    template.quintuple(
      textAlias,
      ScType.VarCommonArc,
      formatJpg,
      ScType.VarPermPosArc,
      nrelFormat
    );
    const res = await client.searchByTemplate(template);
    if (!res.length) {
      console.log('Cannot find image for section!');
      return null;
    }
    console.log(" fetched succesfully", res);
    const linkContent = (await client.getLinkContents([res[0].get(textAlias)]))[0];
    console.log("links content: ", linkContent._data);
    return linkContent._data;
  }
  
  async function fetchVideo(specificSection) {
    console.log('start video fetching...');
    const { nrelYoutubeLessonUrl, formatYoutubeUrl, nrelFormat } = await client.searchKeynodes("nrel_youtube_lesson_url", "format_youtube_url", "nrel_format");
    console.log("Section address is equal to", specificSection);
    const videoAlias = "_video";
    const textAlias = "_text";
    const template = new ScTemplate();
    template.quintuple(
      specificSection,
      ScType.VarCommonArc,
      [ScType.VarNodeLink, videoAlias],
      ScType.VarPermPosArc,
      nrelYoutubeLessonUrl
    );
    template.quintuple(
      videoAlias,
      ScType.VarCommonArc,
      formatYoutubeUrl,
      ScType.VarPermPosArc,
      nrelFormat
    );
    const res = await client.searchByTemplate(template);
    if (!res.length) {
      console.log('cannot find video for section!');
      return new ScAddr(0);
    }
    console.log('video fetched succesfully', res);
    const results = [];
    for (let i = 0; i < res.length; i++){
      const linkContent = ( await client.getLinkContents([res[i].get(videoAlias)]) )[0];
      console.log('video links content: ', linkContent._data);
      results.push(linkContent._data);
    }
    console.log('video links content: ', results);
    return results;
  }

  useEffect(() => {
    const loadData = async () => {
      console.log('start loading data...');
      try {
        const tree = await fetchSection();
        setSectionTree(tree);
        const names = collectSectionNames(tree);
        setSectionNames(names);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  const collectSectionNames = (tree: any, names: string[] = []) => {
    if (!tree) return names;
    names.push(tree.name);
    if (tree.subsections) {
      tree.subsections.forEach((subsection: any) => collectSectionNames(subsection, names));
    }
    return names;
  };

  // Навигация
  const goToSections = () => {
    setSelectedSection(null);
    setParentSection(null);
    setCurrentScreen('sections');
  };

  const goToSubsections = (section: any, parent: any = null) => {
    setParentSection(parent);
    setSelectedSection(section);
    setCurrentScreen('subsections');
  };

  const goToContent = (section: any, parent: any) => {
    setParentSection(parent);
    setSelectedSection(section);
    setCurrentScreen('content');
  };

  const goToVideo = (section: any) => {
    setSelectedSection(section);
    setCurrentScreen('video');
  };

  // Загрузка контента страницы
  const loadPageContent = async (lang: 'ru' | 'eng') => {
    if (!selectedSection) return '';
    let html = lang === 'ru' ? selectedSection.theory : selectedSection.engTheory || '';
    const title = lang === 'ru' ? selectedSection.name : selectedSection.nameEng || 'Section title';
    setSectionTitle(title);
    if (selectedSection.image) {
      const imgHtml = `<div style="text-align: center; margin-top: 20px;">
        <img src="data:image/jpeg;base64,${selectedSection.image}" style="max-width: 100%; max-height: 500px;"/>
      </div>`;
      html += imgHtml;
    }
    return html;
  };

  useEffect(() => {
    if (currentScreen === 'content') {
      const loadPage = async () => {
        const html = await loadPageContent(language);
        setRenderedHtml(html);
      };
      loadPage();
    }
  }, [currentScreen, language, selectedSection]);

  const getIframeSrc = () => {
    const blob = new Blob([renderedHtml], { type: 'text/html' });
    return URL.createObjectURL(blob);
  };

  // Рендер экрана выбора разделов
  const renderSectionSelection = () => (
    <div class="flex flex-col h-full p-5">
      <h2 class="py-1 text-2xl">{language === 'ru' ? 'Выберите раздел' : 'Select section'}</h2>
      <div class="flex flex-col flex-wrap justify-center gap-4 px-10 py-2 sm:flex-row sm:justify-start sm:px-0">
        {sectionTree && (
          <div
            class="flex h-24 w-full items-center justify-center rounded-lg border-2 border-dashed border-[#DCDCDC] cursor-pointer hover:border-[#B8B8B8] hover:bg-[#F5F5F5] text-center text-sm font-medium transition-all sm:w-48"
            onClick={() => goToSubsections(sectionTree)}
          >
            {language === 'ru' ? sectionTree.name : sectionTree.nameEng}
          </div>
        )}
      </div>
    </div>
  );

  // Рендер экрана выбора подразделов
  const renderSubsections = () => {
    if (!selectedSection) return goToSections();

    return (
      <div class="flex flex-col h-full p-5">
        <div class="flex justify-between items-center mb-4">
          <div class="flex gap-2">
            {parentSection && (
              <button 
                onClick={() => goToSubsections(parentSection, null)}
                class="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
              >
                ← {language === 'ru' ? 'Назад' : 'Back'}
              </button>
            )}
            <button 
              onClick={goToSections}
              class="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
            >
              {language === 'ru' ? 'К корню' : 'To root'}
            </button>
          </div>
          <h2 class="text-xl">{language === 'ru' ? selectedSection.name : selectedSection.nameEng}</h2>
          <div></div>
        </div>
        
        <div class="flex flex-col flex-wrap justify-center gap-4 px-10 py-2 sm:flex-row sm:justify-start sm:px-0">
          {selectedSection.subsections?.map((subsection: any) => (
            <div
              key={subsection.addr.value}
              class="flex h-24 w-full items-center justify-center rounded-lg border-2 border-dashed border-[#DCDCDC] cursor-pointer hover:border-[#B8B8B8] hover:bg-[#F5F5F5] text-center text-sm font-medium transition-all sm:w-48"
              onClick={() => {
                if (subsection.subsections?.length > 0) {
                  goToSubsections(subsection, selectedSection);
                } else if (subsection.theory) {
                  goToContent(subsection, selectedSection);
                }
              }}
            >
              {language === 'ru' ? subsection.name : subsection.nameEng}
            </div>
          ))}
          
          {selectedSection.theory && (
            <div
              class="flex h-24 w-full items-center justify-center rounded-lg border-2 border-dashed border-[#DCDCDC] cursor-pointer hover:border-[#B8B8B8] hover:bg-[#F5F5F5] text-center text-sm font-medium transition-all sm:w-48"
              onClick={() => goToContent(selectedSection)}
            >
              {language === 'ru' ? 'Просмотреть теорию' : 'View theory'}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Рендер экрана с контентом
  const renderContent = () => {
    if (!selectedSection) return goToSections();

    return (
      <div class="flex flex-col h-full">
        <div class="flex justify-between items-center p-2 bg-gray-100 border-b">
          <div class="flex gap-2">
            <button
              onClick={() => goToSubsections(parentSection, null)}
              class="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
            >
              ← {language === 'ru' ? 'Назад' : 'Back'}
            </button>
            <button
              onClick={goToSections}
              class="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
            >
              {language === 'ru' ? 'К корню' : 'To root'}
            </button>
            <button
              onClick={() => window.location.href = '/'}
              class="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
            >
              {language === 'ru' ? 'В главное меню' : 'To main menu'}
            </button>
          </div>
          
          <div class="flex gap-2">
            <button
              onClick={() => setLanguage('ru')}
              class={`px-3 py-1 rounded ${language === 'ru' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Русский
            </button>
            <button
              onClick={() => setLanguage('eng')}
              class={`px-3 py-1 rounded ${language === 'eng' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              English
            </button>
          </div>
        </div>

        <div class="flex justify-between items-center p-2 bg-gray-50 border-b">
          <div class="text-sm font-medium">
            {language === 'ru' ? 'Тема' : 'Topic'}: {language === 'ru' ? selectedSection.name : selectedSection.nameEng}
          </div>
          {selectedSection.video && (
            <button
              onClick={() => goToVideo(selectedSection)}
              class="px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
            >
              {language === 'ru' ? 'Перейти к видео' : 'Go to video'}
            </button>
          )}
        </div>

        {renderedHtml && (
          <iframe 
            src={getIframeSrc()}
            class="w-full flex-1 border-none"
            sandbox="allow-same-origin"
            title={`Page ${currentPage} (${language})`}
            key={`${currentPage}-${language}`}
          />
        )}
      </div>
    );
  };

  // Рендер экрана с видео
  const renderVideo = () => {
    if (!selectedSection || !selectedSection.video) return goToContent(selectedSection, parentSection);

    const videoUrl = selectedSection.video[language === 'ru' ? 0 : 1];
    const videoId = videoUrl?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/)?.[1] || '';
    
    return (
      <div class="flex flex-col h-full">
        {/* Панель навигации */}
        <div class="flex justify-between items-center p-2 bg-gray-100 border-b">
          <div class="flex gap-2">
            <button
              onClick={() => goToContent(selectedSection, parentSection)}
              class="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
            >
              ← {language === 'ru' ? 'К теории' : 'To theory'}
            </button>
            <button
              onClick={() => goToSubsections(parentSection, null)}
              class="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
            >
              {language === 'ru' ? 'К разделам' : 'To sections'}
            </button>
            <button
              onClick={goToSections}
              class="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
            >
              {language === 'ru' ? 'К корню' : 'To root'}
            </button>
          </div>
          
          <div class="flex gap-2">
            <button
              onClick={() => setLanguage('ru')}
              class={`px-3 py-1 rounded ${language === 'ru' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Русский
            </button>
            <button
              onClick={() => setLanguage('eng')}
              class={`px-3 py-1 rounded ${language === 'eng' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              English
            </button>
          </div>
        </div>

        {/* Информация о текущей теме */}
        <div class="flex justify-between items-center p-2 bg-gray-50 border-b">
          <div class="text-sm font-medium">
            {language === 'ru' ? 'Видео по теме' : 'Video for topic'}: {language === 'ru' ? selectedSection.name : selectedSection.nameEng}
          </div>
        </div>

        {/* Контейнер с видео */}
        <div class="flex-1 overflow-auto p-4">
          {videoUrl ? (
            <div class="flex flex-col items-center h-full">
              <div class="w-full max-w-4xl h-full">
                <div class="relative h-0 pb-[56.25%]"> {/* 16:9 Aspect Ratio */}
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    class="absolute top-0 left-0 w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={language === 'ru' ? 'Видео по теме' : 'Topic video'}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div class="flex items-center justify-center h-full">
              <p class="text-gray-500">
                {language === 'ru' ? 'Для этой темы нет видео' : 'No videos available for this topic'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Выбор экрана для отображения
  switch (currentScreen) {
    case 'subsections':
      return renderSubsections();
    case 'content':
      return renderContent();
    case 'video':
      return renderVideo();
    default:
      return renderSectionSelection();
  }
};
