import { useEffect, useState } from 'preact/hooks';
import { ScAddr, ScClient, ScTemplate, ScType, ScHelper, ScConstruction } from 'ts-sc-client';

export const GraphTheoryViewer = () => {
  // Состояния
  const [currentPage, setCurrentPage] = useState(1);
  const [renderedHtml, setRenderedHtml] = useState('');
  const [language, setLanguage] = useState<'ru' | 'eng'>('ru');
  const [sectionTitle, setSectionTitle] = useState('');
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [currentScreen, setCurrentScreen] = useState<'sections'|'topics'|'content'|'video'|'test'>('sections');
  const client = new ScClient('ws://localhost:8090/ws_json');
  const helper = new ScHelper(client);
  const [rus1, setRus1] = useState<any>(null);
  const [eng1, setEng1] = useState<any>(null);
  const [sectionNames, setSectionNames] = useState([]);
  const [engSectionNames, setEngSectionNames] = useState([]);
  const [rusTheoryFromSect, setRusTheoryFromSect] = useState([]);
  const [engTheoryFromSect, setEngTheoryFromSect] = useState([]);
  const [rusVideoFromSect, setRusVideoFromSect] = useState([]);
  const [topicsArray, setTopicsArray] = useState<ScAddr[]>([]);
  const [userAddr, setUserAddr] = useState<ScAddr | null>(null);
  const [setOfCompletedSectionsAddr, setSetOfCompletedSectionsAddr] = useState<ScAddr | null>(null);
  
  const initiateActionAndGetResult = async (actionClass: ScAddr, actionParams: ScAddr[]) => {
    const actionAlias = "action";
    const construction = new ScConstruction();
    construction.generateNode(ScType.ConstNode, actionAlias);
    construction.generateConnector(ScType.ConstPermPosArc, actionClass, actionAlias);
    for (let i = 0; i < actionParams.length; i++) {
      const arcAlias = `arc_${i}`;
      const relationIdtf = `rrel_${i + 1}`;
      const relationObject = await client.searchKeynodes(relationIdtf);
      const relationAddr = relationObject[relationIdtf];
      construction.generateConnector(ScType.ConstPermPosArc, actionAlias, actionParams[i], arcAlias);
      construction.generateConnector(ScType.ConstPermPosArc, relationAddr, arcAlias);
    }
    const res = await client.generateElements(construction);
    const actionAddr = res[actionAlias];
    const initiateActionConstruction = new ScConstruction();
    const { actionInitiated } = await client.searchKeynodes("action_initiated");
    initiateActionConstruction.generateConnector(
      ScType.ConstPermPosArc,
      actionInitiated,
      actionAddr
    );
    const result = await client.generateElements(initiateActionConstruction);
    return await helper.getResult();
  }
  
  async function isSectionInSet(set: ScAddr, section: ScAddr) {
    const templ = new ScTemplate;
    templ.triple(
      set,
      ScType.VarPermPosArc,
      [ScType.VarNode, "_section"]
    );
    const res = await client.searchByTemplate(templ);
    for (let i = 0; i < res.length; i++) {
      if (res[i].get("_section") == section)
        return true;
    }
    return false;
  }

  async function fetchSection() {
    console.log('start section fetching...');
    const { sectionSubjectDomainOfNGraph } = await client.searchKeynodes("section_subject_domain_of_n_graph");
    const { nrelSectionDecomposition } = await client.searchKeynodes("nrel_section_decomposition");
    console.log("Section address is equal to", sectionSubjectDomainOfNGraph);
    console.log("Address is equal to", nrelSectionDecomposition);
    const sectionAlias = "_section";
    const textAlias = "_text";
    const template = new ScTemplate();
    template.quintuple(
      [ScType.VarNode, sectionAlias],
      ScType.VarCommonArc,
      sectionSubjectDomainOfNGraph,
      ScType.VarPermPosArc,
      nrelSectionDecomposition
    );
    template.triple(
      sectionAlias,
      ScType.VarPermPosArc,
      [ScType.VarNode, textAlias]
    );
    const res = await client.searchByTemplate(template);
    if (!res.length) {
      console.log('cannot find subsections for section!');
      return new ScAddr(0);
    }
    console.log('section fetched succesfully', res);
    const results = [];
    const resLength = res.length;
    for (let i = 0; i < resLength; i++) {
      const sectionNew = res[i].get(textAlias);
      console.log('Fetching section with addr: ', sectionNew);
      const templateInner = new ScTemplate();
      templateInner.quintuple(
        [ScType.VarNode, sectionAlias],
        ScType.VarCommonArc,
        sectionNew,
        ScType.VarPermPosArc,
        nrelSectionDecomposition
      );
      templateInner.triple(
        sectionAlias,
        ScType.VarPermPosArc,
        [ScType.VarNode, textAlias]
      );
      const newres = await client.searchByTemplate(templateInner);
      console.log("newres", newres);
      if (!newres.length) {
        results.push(res[i].get(textAlias))
      } else {
        for (let i = 0; i < newres.length; i++){
          results.push(newres[i].get(textAlias));
        }
      }
    }
    console.log('sections fetched succesfully: ', results);
    return results;
  }
  
  async function fetchTheory(specificSection) {
    console.log('start section fetching...');
    const { nrelScTextTranslation, langRu } = await client.searchKeynodes("nrel_sc_text_translation", "lang_ru");
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
    const res = await client.searchByTemplate(template);
    if (!res.length) {
      console.log('cannot find theory for section!');
      return new ScAddr(0);
    }
    console.log('theory fetched succesfully', res);
    const linkContent = ( await client.getLinkContents([res[0].get(textAlias)]) )[0];
    console.log('links content: ', linkContent._data);
    return linkContent._data;
  }
  
  async function fetchEngTheory(specificSection) {
    console.log('start section fetching...');
    const { nrelScTextTranslation, langEn } = await client.searchKeynodes("nrel_sc_text_translation", "lang_en");
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
    const res = await client.searchByTemplate(template);
    if (!res.length) {
      console.log('cannot find theory for section!');
      return new ScAddr(0);
    }
    console.log('theory fetched succesfully', res);
    const linkContent = ( await client.getLinkContents([res[0].get(textAlias)]) )[0];
    console.log('links content: ', linkContent._data);
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
  
  console.log('file is loaded');
  useEffect(() => {
  const loadData = async () => {
    console.log('start loading data...');
    try {
      const sectionsArray = await fetchSection();
      console.log('Sections array:', sectionsArray); 
      const sectionNamesTemp = [];
      const engSectionNamesTemp = [];
      const rusTheoryFromSectTemp = [];
      const engTheoryFromSectTemp = [];
      const rusVideoFromSectTemp = [];
      for (let i = 0; i < sectionsArray.length; i++){
        const sectName = await helper.getMainIdentifier(sectionsArray[i], "lang_ru");
        const sectEnName = await helper.getMainIdentifier(sectionsArray[i], "lang_en");
        const res1 = await fetchTheory(sectionsArray[i]);
        const res2 = await fetchEngTheory(sectionsArray[i]);
        const res3 = await fetchVideo(sectionsArray[i]);
        sectionNamesTemp.push(sectName);
        engSectionNamesTemp.push(sectEnName);
        rusTheoryFromSectTemp.push(res1);
        engTheoryFromSectTemp.push(res2);
        rusVideoFromSectTemp.push(res3);
      }
      setSectionNames(sectionNamesTemp);
      setEngSectionNames(engSectionNamesTemp);
      setRusTheoryFromSect(rusTheoryFromSectTemp);
      setEngTheoryFromSect(engTheoryFromSectTemp);
      setRusVideoFromSect(rusVideoFromSectTemp);
      setTopicsArray(sectionsArray)
      const login = localStorage.getItem("username");
      const userAddrTemp = (await client.searchLinksByContents([`user_${login}`]))[0][0];
      setUserAddr(userAddrTemp);
      
      const { nrelCompletedSections } = await client.searchKeynodes("nrel_completed_sections");
      const templ = new ScTemplate;
      templ.quintuple(
        userAddr,
        ScType.VarCommonArc,
        [ScType.VarNodeTuple ,"_set_of_completed_sections"],
        ScType.VarPermPosArc,
        nrelCompletedSections
        );
      const res = await client.searchByTemplate(templ);
      if (res.length) {
        setSetOfCompletedSectionsAddr(res[0].get("_set_of_completed_sections"))
      }
      
      console.log('section names', sectionNamesTemp);
      console.log('theory loaded success', rusTheoryFromSectTemp);
      console.log('video loaded success', rusVideoFromSectTemp);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };
  loadData(); 
}, []);

  if (rusVideoFromSect.length === 0 || sectionNames.length === 0) {
  return <div>Загрузка...</div>;
  }

  // Полные данные разделов и тем
  const sections = [
    { 
      id: 1, 
      name: 'Первый раздел', 
      nameEng: 'First section',
      topics: [
        { 
          id: 1, 
          name: sectionNames[0], 
          nameEng: engSectionNames[0], 
          page: 1, 
          contents: {
            ru: rusTheoryFromSect[0],
            eng: engTheoryFromSect[0]
          },
          videoUrls: {
            ru: rusVideoFromSect[0][0],
            eng: rusVideoFromSect[0][1]
          },
          addr: topicsArray[0],
        },
        { 
          id: 2, 
          name: sectionNames[1], 
          nameEng: engSectionNames[1], 
          page: 2, 
          contents: {
            ru: rusTheoryFromSect[1],
            eng: engTheoryFromSect[1]
          },
          videoUrls: {
            ru: rusVideoFromSect[1][0],
            eng: rusVideoFromSect[1][1]
          },
          addr: topicsArray[1],
        }
      ]
    },
    { 
      id: 2, 
      name: 'Второй раздел', 
      nameEng: 'Second section',
      topics: [
        { id: 1, name: sectionNames[2], nameEng: engSectionNames[2], page: 3, contents: {
            ru: rusTheoryFromSect[2],
            eng: engTheoryFromSect[2]
          }, videoUrls: { ru: rusVideoFromSect[2][0], eng: rusVideoFromSect[2][1] },
          addr: topicsArray[2], },
        { id: 2, name: sectionNames[3], nameEng: engSectionNames[3], page: 4, contents: {
            ru: rusTheoryFromSect[3],
            eng: engTheoryFromSect[3]
          }, videoUrls: { ru: rusVideoFromSect[3][0], eng: rusVideoFromSect[3][1] },
          addr: topicsArray[3], },
        { id: 3, name: sectionNames[4], nameEng: engSectionNames[4], page: 5, contents: {
            ru: rusTheoryFromSect[4],
            eng: engTheoryFromSect[4]
          }, videoUrls: { ru: rusVideoFromSect[4][0], eng: rusVideoFromSect[4][1] },
          addr: topicsArray[4], },
        { id: 4, name: sectionNames[5], nameEng: engSectionNames[5], page: 6, contents: {
            ru: rusTheoryFromSect[5],
            eng: engTheoryFromSect[5]
          }, videoUrls: { ru: rusVideoFromSect[5][0], eng: rusVideoFromSect[5][1] },
          addr: topicsArray[5], },
        { id: 5, name: sectionNames[6], nameEng: engSectionNames[6], page: 7, contents: {
            ru: rusTheoryFromSect[6],
            eng: engTheoryFromSect[6]
          }, videoUrls: { ru: rusVideoFromSect[6][0], eng: rusVideoFromSect[6][1] },
          addr: topicsArray[6], },
        { id: 6, name: sectionNames[7], nameEng: engSectionNames[7], page: 8, contents: {
            ru: rusTheoryFromSect[7],
            eng: engTheoryFromSect[7]
          }, videoUrls: { ru: rusVideoFromSect[7][0], eng: rusVideoFromSect[7][1] },
          addr: topicsArray[7], },
        { id: 7, name: sectionNames[8], nameEng: engSectionNames[8], page: 9, contents: {
            ru: rusTheoryFromSect[8],
            eng: engTheoryFromSect[8]
          }, videoUrls: { ru: rusVideoFromSect[8][0], eng: rusVideoFromSect[8][1] },
          addr: topicsArray[8], }
      ]
    },
    { 
      id: 3, 
      name: 'Третий раздел', 
      nameEng: 'Third section',
      topics: [
        { id: 1, name: sectionNames[9], nameEng: engSectionNames[9], page: 10, contents: {
            ru: rusTheoryFromSect[9],
            eng: engTheoryFromSect[9]
          }, videoUrls: { ru: rusVideoFromSect[9][0], eng: rusVideoFromSect[9][1] },
          addr: topicsArray[9], },
        { id: 2, name: sectionNames[10], nameEng: engSectionNames[10], page: 11, contents: {
            ru: rusTheoryFromSect[10],
            eng: engTheoryFromSect[10]
          }, videoUrls: { ru: rusVideoFromSect[10][0], eng: rusVideoFromSect[10][1] },
          addr: topicsArray[10], },
        { id: 3, name: sectionNames[11], nameEng: engSectionNames[11], page: 12, contents: {
            ru: rusTheoryFromSect[11],
            eng: engTheoryFromSect[11]
          }, videoUrls: { ru: rusVideoFromSect[11][0], eng: rusVideoFromSect[11][1] },
          addr: topicsArray[11], }
      ]
    },
    { 
      id: 4, 
      name: 'Четвёртый раздел', 
      nameEng: 'Fourth section',
      topics: [
        { id: 1, name: sectionNames[12], nameEng: engSectionNames[12], page: 13, contents: {
            ru: rusTheoryFromSect[12],
            eng: engTheoryFromSect[12]
          }, videoUrls: { ru: rusVideoFromSect[12][0], eng: rusVideoFromSect[12][1] },
          addr: topicsArray[12], },
        { id: 2, name: sectionNames[13], nameEng: engSectionNames[13], page: 14, contents: {
            ru: rusTheoryFromSect[13],
            eng: engTheoryFromSect[13]
          }, videoUrls: { ru: rusVideoFromSect[13][0], eng: rusVideoFromSect[13][1] },
          addr: topicsArray[13], }
      ]
    },
    { 
      id: 5, 
      name: 'Пятый раздел', 
      nameEng: 'Fifth section',
      topics: [
        { id: 1, name: sectionNames[14], nameEng: engSectionNames[14], page: 15, contents: {
            ru: rusTheoryFromSect[14],
            eng: engTheoryFromSect[14]
          }, videoUrls: { ru: rusVideoFromSect[14][0], eng: rusVideoFromSect[14][1] },
          addr: topicsArray[14], },
        { id: 2, name: sectionNames[15], nameEng: engSectionNames[15], page: 16, contents: {
            ru: rusTheoryFromSect[15],
            eng: engTheoryFromSect[15]
          }, videoUrls: { ru: rusVideoFromSect[15][0], eng: rusVideoFromSect[15][1] },
          addr: topicsArray[15], },
        { id: 3, name: sectionNames[16], nameEng: engSectionNames[16], page: 17, contents: {
            ru: rusTheoryFromSect[16],
            eng: engTheoryFromSect[16]
          }, videoUrls: { ru: rusVideoFromSect[16][0], eng: rusVideoFromSect[16][1] },
          addr: topicsArray[16], }
      ]
    },
    { 
      id: 6, 
      name: 'Шестой раздел', 
      nameEng: 'Sixth section',
      topics: [
        { id: 1, name: sectionNames[17], nameEng: engSectionNames[17], page: 18, contents: {
            ru: rusTheoryFromSect[17],
            eng: engTheoryFromSect[17]
          }, videoUrls: { ru: rusVideoFromSect[17][0], eng: rusVideoFromSect[17][1] },
          addr: topicsArray[17], },
        { id: 2, name: sectionNames[18], nameEng: engSectionNames[18], page: 19, contents: {
            ru: rusTheoryFromSect[18],
            eng: engTheoryFromSect[18]
          }, videoUrls: { ru: rusVideoFromSect[18][0], eng: rusVideoFromSect[18][1] },
          addr: topicsArray[18], },
        { id: 3, name: sectionNames[19], nameEng: engSectionNames[19], page: 20, contents: {
            ru: rusTheoryFromSect[19],
            eng: engTheoryFromSect[19]
          }, videoUrls: { ru: rusVideoFromSect[19][0], eng: rusVideoFromSect[19][1] },
          addr: topicsArray[19], },
        { id: 4, name: sectionNames[20], nameEng: engSectionNames[20], page: 21, contents: {
            ru: rusTheoryFromSect[20],
            eng: engTheoryFromSect[20]
          }, videoUrls: { ru: rusVideoFromSect[20][0], eng: rusVideoFromSect[20][1] },
          addr: topicsArray[20], }
      ]
    }
  ];

  // Навигация
  const goToSections = () => {
    setSelectedSection(null);
    setSelectedTopic(null);
    setCurrentScreen('sections');
  };

  const goToTopics = (sectionId: number) => {
    setSelectedSection(sectionId);
    setCurrentScreen('topics');
  };

  const goToContent = (topicId: number, page: number) => {
    setSelectedTopic(topicId);
    setCurrentPage(page);
    setCurrentScreen('content');
  };

  const goToVideo = (topicId: number) => {
    setSelectedTopic(topicId);
    setCurrentScreen('video');
  };

  const extractSectionTitle = (html: string) => {
    const lines = html.split('\n');
    
    const cleanText = (line: string) => {
      return line
        .replace(/<[^>]*>/g, ' ') // Удаляем HTML-теги
        .replace(/@page\s*{[^}]*}/g, '') // Удаляем @page правила
        .replace(/\.[a-zA-Z\-]+\s*{[^}]*}/g, '') // Удаляем классы CSS
        .replace(/[a-zA-Z\-]+:\s*[^;]+;/g, '') // Удаляем CSS свойства
        .replace(/\s+/g, ' ') // Удаляем лишние пробелы
        .trim();
    };

    const lineChecks = [
      [19, 20], [18, 19], [22, 23], 
      [23, 24], [27, 28], [32, 33], 
      [36, 37]
    ];

    for (const [line1, line2] of lineChecks) {
      const text1 = cleanText(lines[line1] || '');
      const text2 = cleanText(lines[line2] || '');
      const combinedText = `${text1} ${text2}`.trim();
      
      if (combinedText.length > 3 && 
          !combinedText.startsWith('@') && 
          !combinedText.match(/[{}:]/)) {
        return combinedText;
      }
    }

    const singleLines = [18, 19, 20, 22, 23, 24, 27, 28, 32, 33, 36, 37];
    for (const lineNum of singleLines) {
      const text = cleanText(lines[lineNum] || '');
      if (text.length > 3 && !text.match(/[{}:@]/)) {
        return text;
      }
    }

    return language === 'ru' ? 'Название раздела' : 'Section title';
  };

  // Загрузка контента страницы
  const loadPageContent = async (page: number, lang: 'ru' | 'eng') => {
    if (selectedSection === null || selectedTopic === null) return '';
    const current = sections.find(s => s.id === selectedSection);
    const topic = current?.topics.find(t => t.id === selectedTopic);
    const html = topic?.contents[lang] || '';
    const title = extractSectionTitle(html);
    setSectionTitle(title);
    return html;
  };
  // Загрузка контента при изменении страницы
  useEffect(() => {
    if (currentScreen === 'content' && selectedTopic !== null) {
      const loadPage = async () => {
        const html = await loadPageContent(currentPage, language);
        setRenderedHtml(html);
      };
      loadPage();
    }
  }, [currentPage, language, selectedTopic, currentScreen]);

  // Генерация URL для iframe
  const getIframeSrc = () => {
    const blob = new Blob([renderedHtml], { type: 'text/html' });
    return URL.createObjectURL(blob);
  };

  // Получение текущего раздела и темы
  const currentSection = sections.find(s => s.id === selectedSection);
  const currentTopic = currentSection?.topics.find(t => t.id === selectedTopic);

  // Рендер экрана выбора разделов
  const renderSectionSelection = () => (
    <div class="flex flex-col h-full p-5">
      <h2 class="py-1 text-2xl">{language === 'ru' ? 'Выберите раздел' : 'Select section'}</h2>
      <div class="flex flex-col flex-wrap justify-center gap-4 px-10 py-2 sm:flex-row sm:justify-start sm:px-0">
        {sections.map(section => (
          <div
            key={section.id}
            class="flex h-24 w-full items-center justify-center rounded-lg border-2 border-dashed border-[#DCDCDC] cursor-pointer hover:border-[#B8B8B8] hover:bg-[#F5F5F5] text-center text-sm font-medium transition-all sm:w-48"
            onClick={() => goToTopics(section.id)}
          >
            {language === 'ru' ? section.name : section.nameEng}
          </div>
        ))}
      </div>
    </div>
  );

  // Рендер экрана выбора тем
  const renderTopicSelection = () => {
    if (!currentSection) return goToSections();
    
    /*useEffect(() => {
    const fetchData = async () => {
      for (let i = 0; i < currentSection.topics.length; i++) {
        if (await isSectionInSet(setOfCompletedSectionsAddr, currentSection.topics[i].addr) == false) {

        }
    }
    };
    fetchData();
  }, []); */

    return (
      <div class="flex flex-col h-full p-5">
        <div class="flex justify-between items-center mb-4">
          <button 
            onClick={goToSections}
            class="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
          >
            ← {language === 'ru' ? 'К разделам' : 'To sections'}
          </button>
          <h2 class="text-xl">{language === 'ru' ? currentSection.name : currentSection.nameEng}</h2>
          <div></div>
        </div>
        
        <div class="flex flex-col flex-wrap justify-center gap-4 px-10 py-2 sm:flex-row sm:justify-start sm:px-0">
          {currentSection.topics.map(topic => (
            <div
              key={topic.id}
              class="flex flex-col h-24 w-full items-center justify-center rounded-lg border-2 border-dashed border-[#DCDCDC] cursor-pointer hover:border-[#B8B8B8] hover:bg-[#F5F5F5] text-center text-sm font-medium transition-all sm:w-48"
              onClick={() => goToContent(topic.id, topic.page)}
            >
              {language === 'ru' ? topic.name : topic.nameEng}
              
            </div>
          ))}
        </div>
      </div>
    );
  };


  // Рендер экрана с контентом
  const renderContent = () => {
    if (!currentSection || !currentTopic) return goToSections();
    
    /*useEffect(() => {
    const fetchData = async () => {
      try {
        const {actionAddSectionToSet} = await client.searchKeynodes("action_add_section_to_set")
        console.log("Action Add Section To Set: ", actionAddSectionToSet)
        const actionParams = [userAddr, currentTopic.addr];
        console.log("User Addr: ", userAddr);
        console.log("Current Topic Addr: ", currentTopic.addr)
        const result = await initiateActionAndGetResult(actionAddSectionToSet, actionParams);
        console.log("result: ", result);
        const setOfCompletedSectionsAlias = "_set_of_completed_sections";
        const templ = new ScTemplate;
        templ.quintuple(
          [ScType.VarNodeTuple, setOfCompletedSectionsAlias],
          ScType.VarPermPosArc,
          currentTopic.addr,
          ScType.VarPermPosArc,
          result
          );
        const res = await client.searchByTemplate(templ);
        if (res.length) {
          setSetOfCompletedSectionsAddr(res[0].get(setOfCompletedSectionsAlias));
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }        
    };
    fetchData();
  }, []); */

    console.log("SET: ", setOfCompletedSectionsAddr);
    useEffect(() => {
    const fetchData = async () => {
      try {
        const { nrelCompletedSections } = await client.searchKeynodes("nrel_completed_sections");
        const templ = new ScTemplate;
        templ.quintuple(
          userAddr,
          ScType.VarCommonArc,
          [ScType.VarNodeTuple ,"_set_of_completed_sections"],
          ScType.VarPermPosArc,
          nrelCompletedSections
          );
        const res = await client.searchByTemplate(templ);
        if (res.length) { //множество есть
          setSetOfCompletedSectionsAddr(res[0].get("_set_of_completed_sections"));
        }
        else {  //множества нет
          const construction = new ScConstruction;
          const tupleAlias = "_set";
          const arcAlias = "_arc";
          construction.generateNode(ScType.ConstNodeTuple, tupleAlias)
          construction.generateConnector(ScType.ConstCommonArc, userAddr, tupleAlias, arcAlias);
          construction.generateConnector(ScType.ConstPermPosArc, nrelCompletedSections, arcAlias);
          const result = await client.generateElements(construction);
          setSetOfCompletedSectionsAddr(result[tupleAlias]);
        }
        if (await isSectionInSet(setOfCompletedSectionsAddr, currentTopic.addr) == false) {
          const construction = new ScConstruction;
          construction.generateConnector(ScType.ConstPermPosArc, setOfCompletedSectionsAddr, currentTopic.addr);
          const result = await client.generateElements(construction);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }        
    };
    fetchData();
  }, []); 
    console.log("SET: ", setOfCompletedSectionsAddr);
    return (
      <div class="flex flex-col h-full">
        {/* Панель навигации */}
        <div class="flex justify-between items-center p-2 bg-gray-100 border-b">
          <div class="flex gap-2">
            <button
              onClick={() => setCurrentScreen('topics')}
              class="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
            >
              ← {language === 'ru' ? 'К темам' : 'To topics'}
            </button>
            <button
              onClick={goToSections}
              class="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
            >
              {language === 'ru' ? 'К разделам' : 'To sections'}
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

        {/* Информация о текущей теме */}
        <div class="flex justify-between items-center p-2 bg-gray-50 border-b">
          <div class="text-sm font-medium">
            {language === 'ru' ? 'Тема' : 'Topic'}: {language === 'ru' ? currentTopic.name : currentTopic.nameEng}
          </div>
          
          {currentTopic.videoUrls && (
            <button
              onClick={() => goToVideo(currentTopic.id)}
              class="px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
            >
              {language === 'ru' ? 'Перейти к видео' : 'Go to video'}
            </button>
          )}
        </div>

        {/* Контейнер с контентом */}
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
    if (!currentSection || !currentTopic) return goToSections();

    const videoUrl = currentTopic.videoUrls ? currentTopic.videoUrls[language] : null;
    const videoId = videoUrl?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/)?.[1] || '';
    
    return (
      <div class="flex flex-col h-full">
        {/* Панель навигации */}
        <div class="flex justify-between items-center p-2 bg-gray-100 border-b">
          <div class="flex gap-2">
            <button
              onClick={() => setCurrentScreen('content')}
              class="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
            >
              ← {language === 'ru' ? 'К теме' : 'To topic'}
            </button>
            <button
              onClick={() => setCurrentScreen('topics')}
              class="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
            >
              {language === 'ru' ? 'К темам' : 'To topics'}
            </button>
            <button
              onClick={goToSections}
              class="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
            >
              {language === 'ru' ? 'К разделам' : 'To sections'}
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
            {language === 'ru' ? 'Видео по теме' : 'Video for topic'}: {language === 'ru' ? currentTopic.name : currentTopic.nameEng}
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
    case 'topics':
      return renderTopicSelection();
    case 'content':
      return renderContent();
    case 'video':
      return renderVideo();
    default:
      return renderSectionSelection();
  }
};
