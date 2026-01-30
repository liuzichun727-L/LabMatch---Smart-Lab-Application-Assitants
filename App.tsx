
import React, { useState, useRef } from 'react';
import { Layout } from './components/Layout';
import { Professor, StudentProfile, EmailDraft, Language } from './types';
import { findProfessors, matchStudentWithProfessors, generateDraftEmail, parseCV } from './services/geminiService';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

enum Step {
  Landing,
  Profile,
  Search,
  Results,
  Draft
}

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>(Step.Landing);
  const [currentView, setCurrentView] = useState<'app' | 'tos' | 'privacy'>('app');
  const [lang, setLang] = useState<Language>('en');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [profile, setProfile] = useState<StudentProfile>({
    name: '',
    education: '',
    interests: '',
    skills: '',
    cvText: ''
  });
  const [university, setUniversity] = useState('');
  const [department, setDepartment] = useState('');
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [sources, setSources] = useState<{title?: string, uri?: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Processing...');
  const [loadingEstimate, setLoadingEstimate] = useState('');
  const [selectedProf, setSelectedProf] = useState<Professor | null>(null);
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = {
    en: {
      tag: "Laboratory Matching Intelligence",
      hero: "Find the Right Lab. Save Days of Emailing.",
      sub: "AI-powered precision matching that identifies your ideal research environment and drafts high-conversion application emails instantly.",
      getStarted: "Get Started",
      tutorial: "How it Works",
      back: "Back",
      next: "Next",
      step1: "Academic Profile",
      step2: "Destination",
      step3: "Matches",
      step4: "Email Strategy",
      upload: "Upload CV (PDF/Text)",
      skills: "Technical Skills",
      interests: "Research Interests",
      uni: "Target University",
      dept: "Target Department",
      scan: "Scan Faculty",
      copy: "Copy Draft",
      save: "Save PDF",
      loading: "Analyzing scientific alignment...",
      est_cv: "~5s extraction",
      est_search: "~1 min crawl",
      est_draft: "~10s generation",
      tos_title: "Terms of Service",
      privacy_title: "Privacy Policy",
      results_sub: "Analyzing 15+ faculty profiles. Ranked by research alignment.",
      bulk: "Generate Tier",
      exportWord: "Export Tier to Word",
      view_draft: "View Draft",
      validation: "Please fill out this field.",
      tier_pre: "Tier",
      tier_1: "High Match",
      tier_2: "Strong Match",
      tier_3: "Potential Match",
      label_prof: "Professor",
      label_subject: "Subject",
      label_name: "Name",
      label_edu: "Education",
      upload_status: {
        extracted: "EXTRACTED",
        idle: "DRAG OR CLICK"
      },
      copy_status: "Copied",
      tutorial_steps: [
        { title: "Academic Profiling", desc: "Upload your CV. Our AI extracts your core technical strengths and research trajectory." },
        { title: "Institution Targeting", desc: "Specify any university worldwide. We crawl their current faculty listings and recent publications." },
        { title: "Scientific Alignment", desc: "The engine cross-references your skills with faculty research focus, ranking them by true 'fit'." },
        { title: "Instant Outreach", desc: "Generate professional, personalized cold emails that highlight your specific value to their lab." }
      ],
      close: "Close",
      placeholders: {
        name: "e.g. Alex Rivera",
        edu: "e.g. Engineering, sophomore",
        skills: "e.g. Python, CRISPR, Statistics",
        interests: "e.g. Synthetic Biology, LLMs",
        uni: "e.g. Harvard University",
        dept: "e.g. Department of Biology"
      }
    },
    zh: {
      tag: "实验室智能匹配平台",
      hero: "精准匹配实验室。告别繁琐的申请邮件。",
      sub: "AI驱动的精准匹配系统，助您找到理想的科研环境，并瞬间生成高成功率的申请邮件，大幅节省您的宝贵时间。",
      getStarted: "立即开始",
      tutorial: "如何使用",
      back: "返回",
      next: "下一步",
      step1: "个人学术档案",
      step2: "目标科研机构",
      step3: "精准匹配列表",
      step4: "邮件沟通策略",
      upload: "上传个人简历 (PDF/Text格式)",
      skills: "核心技术技能",
      interests: "具体研究兴趣",
      uni: "目标大学名称",
      dept: "目标院系名称",
      scan: "开始检索教职员工",
      copy: "复制草拟邮件",
      save: "保存为 PDF",
      loading: "正在进行科学契合度分析...",
      est_cv: "预计 5 秒 提取文本",
      est_search: "预计 1分钟 网页检索",
      est_draft: "预计 10 秒 撰写草稿",
      tos_title: "服务条款",
      privacy_title: "隐私政策",
      results_sub: "正在检索并分析 15+ 教授简介。根据您的简历研究契合度进行排名。",
      bulk: "一键生成本组邮件",
      exportWord: "导出本组为 Word 文档",
      view_draft: "查看邮件草稿",
      validation: "请填写此字段",
      tier_pre: "匹配梯队",
      tier_1: "极高契合",
      tier_2: "较强关联",
      tier_3: "潜在机会",
      label_prof: "目标教授",
      label_subject: "邮件主题",
      label_name: "您的姓名",
      label_edu: "当前学历/年级",
      upload_status: {
        extracted: "已提取解析",
        idle: "点击或拖拽上传"
      },
      copy_status: "已复制到剪贴板",
      tutorial_steps: [
        { title: "1. 解析学术档案", desc: "上传简历，AI 将自动提取您的核心技术优势与过往科研路径。" },
        { title: "2. 锁定目标院系", desc: "输入全球任意大学。系统将检索最新的教职列表与研究动态。" },
        { title: "3. 科学契合度匹配", desc: "系统将您的技能点与教授的研究重心进行对撞分析，为您排出匹配优先级。" },
        { title: "4. 秒级生成邮件", desc: "自动撰写地道、专业的申请信，精准击中教授的研究兴趣点。" }
      ],
      close: "关闭",
      placeholders: {
        name: "例如：张三",
        edu: "例如：工程学院，大二学生",
        skills: "例如：Python, CRISPR, 统计学",
        interests: "例如：合成生物学，大语言模型推理",
        uni: "例如：清华大学",
        dept: "例如：生物科学系"
      }
    }
  }[lang];

  const handleInvalid = (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    target.setCustomValidity(t.validation);
  };

  const handleInput = (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    target.setCustomValidity("");
  };

  const handleStepTransition = (nextStep: Step) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStep(nextStep);
      setIsTransitioning(false);
    }, 400);
  };

  const handleHomeClick = () => {
    if (currentView !== 'app') setCurrentView('app');
    if (currentStep !== Step.Landing) handleStepTransition(Step.Landing);
  };

  const getProgressPercentage = () => {
    switch (currentStep) {
      case Step.Landing: return 0;
      case Step.Profile: return 25;
      case Step.Search: return 50;
      case Step.Results: return 75;
      case Step.Draft: return 100;
      default: return 0;
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    // @ts-ignore
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str);
      fullText += strings.join(" ") + "\n";
    }
    return fullText;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setLoadingText(lang === 'en' ? "Extracting CV..." : "正在解析简历内容...");
    setLoadingEstimate(t.est_cv);
    try {
      let text = "";
      if (file.type === 'application/pdf') {
        text = await extractTextFromPDF(file);
      } else {
        text = await file.text();
      }
      
      setProfile(prev => ({ ...prev, cvText: text }));
      
      const autofillData = await parseCV(text);
      if (autofillData) {
        setProfile(prev => ({
          ...prev,
          name: autofillData.name || prev.name,
          education: autofillData.education || prev.education,
          skills: autofillData.skills || prev.skills
        }));
      }
    } catch (err) {
      alert(lang === 'en' ? "Failed to read document." : "文档解析失败。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoadingText(lang === 'en' ? `Scanning ${university}...` : `正在检索 ${university} 院系目录...`);
    setLoadingEstimate(t.est_search);
    try {
      const { professors: found, sources: searchSources } = await findProfessors(university, department);
      setSources(searchSources);
      setLoadingText(lang === 'en' ? "Matching interests..." : "正在计算研究契合度...");
      const matched = await matchStudentWithProfessors(profile, found);
      setProfessors(matched.map(p => ({ ...p, draftStatus: 'idle' })));
      handleStepTransition(Step.Results);
    } catch (err) {
      alert(lang === 'en' ? "Search failed. Please retry." : "检索失败，请重试。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProfessor = async (prof: Professor) => {
    setSelectedProf(prof);
    setIsLoading(true);
    setLoadingText(lang === 'en' ? `Drafting...` : `正在生成个性化邮件...`);
    setLoadingEstimate(t.est_draft);
    try {
      const draft = await generateDraftEmail(profile, prof, lang);
      setEmailDraft(draft);
      handleStepTransition(Step.Draft);
    } catch (err) {
      alert(lang === 'en' ? "Draft generation failed." : "草稿生成失败。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkGenerate = async (tier: 1 | 2 | 3) => {
    const targets = professors.filter(p => p.tier === tier);
    if (targets.length === 0) return;
    setBulkProcessing(true);
    const updatedProfs = [...professors];
    for (let i = 0; i < updatedProfs.length; i++) {
      if (updatedProfs[i].tier === tier) {
        updatedProfs[i].draftStatus = 'loading';
        setProfessors([...updatedProfs]);
        try {
          const draft = await generateDraftEmail(profile, updatedProfs[i], lang);
          updatedProfs[i].generatedDraft = draft;
          updatedProfs[i].draftStatus = 'completed';
        } catch (e) {
          updatedProfs[i].draftStatus = 'idle';
        }
        setProfessors([...updatedProfs]);
      }
    }
    setBulkProcessing(false);
  };

  const handleExportTier = async (tier: 1 | 2 | 3) => {
    const targets = professors.filter(p => p.tier === tier && p.generatedDraft);
    if (targets.length === 0) {
      alert(lang === 'en' ? "Please generate drafts first." : "请先生成邮件草稿。");
      return;
    }

    const sections = targets.map((prof) => {
      return [
        new Paragraph({ 
          children: [new TextRun({ text: prof.name, bold: true, size: 28 })],
          heading: HeadingLevel.HEADING_1 
        }),
        new Paragraph({ children: [new TextRun({ text: `${lang === 'en' ? 'Match Score' : '契合分数'}: ${prof.matchScore}%`, bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: prof.researchInterests.join(', '), italics: true })] }),
        new Paragraph({ text: `${lang === 'en' ? 'Why Match?' : '匹配原因'}: ${prof.matchReason}` }),
        new Paragraph({ text: "" }),
        new Paragraph({ 
          children: [new TextRun({ text: lang === 'en' ? "DRAFT EMAIL" : "申请邮件草稿", bold: true, underline: {} })],
          heading: HeadingLevel.HEADING_2 
        }),
        new Paragraph({ children: [new TextRun({ text: `${lang === 'en' ? 'Subject' : '主题'}: ${prof.generatedDraft?.subject}`, bold: true })] }),
        new Paragraph({ text: "" }),
        new Paragraph({ text: prof.generatedDraft?.body }),
        new Paragraph({ text: "\n" }),
      ];
    }).flat();

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ 
            children: [new TextRun({ text: `LabMatch Export - Tier ${tier}`, bold: true, size: 36 })],
            heading: HeadingLevel.TITLE 
          }),
          ...sections
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LabMatch_Tier${tier}_Export.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (currentView === 'tos' || currentView === 'privacy') {
    return (
      <Layout lang={lang} onLangToggle={() => setLang(l => l === 'en' ? 'zh' : 'en')} onNavigate={setCurrentView} onHomeClick={handleHomeClick}>
        <div className="max-w-3xl mx-auto px-4 py-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h1 className="text-4xl font-bold mb-8 text-slate-900">{currentView === 'tos' ? t.tos_title : t.privacy_title}</h1>
          <div className="prose prose-slate max-w-none text-slate-600 space-y-4">
            <p>{lang === 'en' ? 'Last updated:' : '最后更新日期：'} {new Date().toLocaleDateString()}</p>
            <p>1. <b>{lang === 'en' ? 'Service Usage' : '服务使用'}</b>: LabMatch provides AI-assisted matching tools.</p>
            <p>2. <b>{lang === 'en' ? 'Data Policy' : '数据政策'}</b>: We respect your privacy.</p>
          </div>
          <button onClick={() => setCurrentView('app')} className="mt-12 text-slate-900 font-bold underline">{lang === 'en' ? 'Return to App' : '返回应用'}</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout lang={lang} onLangToggle={() => setLang(l => l === 'en' ? 'zh' : 'en')} onNavigate={setCurrentView} onHomeClick={handleHomeClick}>
      <div className={`transition-all duration-500 ${isTransitioning ? 'opacity-0 -translate-y-4 blur-sm' : 'opacity-100 translate-y-0 blur-0'}`}>
        {currentStep === Step.Landing && (
          <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 z-0">
              <img 
                src="https://images.unsplash.com/photo-1581093588401-fbb62a02f120?auto=format&fit=crop&q=80&w=2070" 
                className="w-full h-full object-cover opacity-20 grayscale"
                alt="Lab Background"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white"></div>
            </div>
            
            <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
              <div className="inline-block px-4 py-1.5 border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                {t.tag}
              </div>
              <h1 className="text-6xl md:text-8xl font-bold text-slate-950 tracking-tighter mb-8 leading-[0.85] animate-in fade-in slide-in-from-bottom-8 duration-700">
                {t.hero}
              </h1>
              <p className="text-xl text-slate-500 font-medium mb-12 max-w-2xl mx-auto animate-in fade-in duration-1000">
                {t.sub}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-in zoom-in duration-1000">
                <button 
                  onClick={() => handleStepTransition(Step.Profile)}
                  className="bg-slate-900 text-white w-20 h-20 rounded-full flex items-center justify-center hover:bg-slate-800 transition-all hover:scale-110 shadow-xl shadow-slate-200 group"
                  title={t.getStarted}
                >
                  <i className="fas fa-play ml-1 group-hover:scale-125 transition-transform"></i>
                </button>
                <button 
                  onClick={() => setShowTutorial(true)}
                  className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors border-b-2 border-transparent hover:border-slate-900 pb-1"
                >
                  {t.tutorial}
                </button>
              </div>
            </div>
          </section>
        )}

        {currentStep !== Step.Landing && (
          <div className="max-w-6xl mx-auto px-4 py-12">
            <div className="mb-16">
              <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-slate-900 transition-all duration-700 ease-in-out"
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-4">
                {[t.step1, t.step2, t.step3, t.step4].map((label, idx) => (
                  <span key={idx} className={`text-[9px] font-black uppercase tracking-widest transition-colors duration-500 ${getProgressPercentage() >= (idx + 1) * 25 ? 'text-slate-900' : 'text-slate-300'}`}>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {currentStep === Step.Profile && (
              <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-3xl font-bold mb-8 text-slate-900 tracking-tight">{t.step1}</h2>
                <form onSubmit={(e) => { e.preventDefault(); handleStepTransition(Step.Search); }} className="space-y-8">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.label_name}</label>
                      <input 
                        required 
                        onInvalid={handleInvalid}
                        onInput={handleInput}
                        className="w-full bg-slate-50 border-none p-4 rounded-xl focus:ring-1 focus:ring-slate-900 outline-none transition-shadow" 
                        placeholder={t.placeholders.name}
                        value={profile.name} 
                        onChange={e => setProfile({...profile, name: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.label_edu}</label>
                      <input 
                        required 
                        onInvalid={handleInvalid}
                        onInput={handleInput}
                        className="w-full bg-slate-50 border-none p-4 rounded-xl focus:ring-1 focus:ring-slate-900 outline-none transition-shadow" 
                        placeholder={t.placeholders.edu}
                        value={profile.education} 
                        onChange={e => setProfile({...profile, education: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.upload}</label>
                    <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed p-10 rounded-2xl flex flex-col items-center cursor-pointer transition-all duration-300 ${profile.cvText ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-900 hover:bg-white'}`}>
                      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".pdf,.txt" />
                      <i className={`fas ${profile.cvText ? 'fa-check' : 'fa-upload'} text-xl mb-2 ${profile.cvText ? 'animate-bounce' : ''}`}></i>
                      <span className="text-[10px] font-bold uppercase tracking-widest">{profile.cvText ? t.upload_status.extracted : t.upload_status.idle}</span>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.skills}</label>
                      <input 
                        required 
                        onInvalid={handleInvalid}
                        onInput={handleInput}
                        className="w-full bg-slate-50 border-none p-4 rounded-xl focus:ring-1 focus:ring-slate-900 outline-none transition-shadow" 
                        placeholder={t.placeholders.skills}
                        value={profile.skills} 
                        onChange={e => setProfile({...profile, skills: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.interests}</label>
                      <input 
                        required 
                        onInvalid={handleInvalid}
                        onInput={handleInput}
                        className="w-full bg-slate-50 border-none p-4 rounded-xl focus:ring-1 focus:ring-slate-900 outline-none transition-shadow" 
                        placeholder={t.placeholders.interests}
                        value={profile.interests} 
                        onChange={e => setProfile({...profile, interests: e.target.value})} 
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-xl font-bold hover:bg-slate-800 transition-all uppercase tracking-widest text-xs active:scale-95 shadow-lg shadow-slate-100">
                    {t.next}
                  </button>
                </form>
              </div>
            )}

            {currentStep === Step.Search && (
              <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
                <h2 className="text-3xl font-bold mb-8 text-slate-900 tracking-tight">{t.step2}</h2>
                <form onSubmit={handleSearch} className="space-y-8">
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.uni}</label>
                    <input 
                      required 
                      onInvalid={handleInvalid}
                      onInput={handleInput}
                      className="w-full bg-slate-50 border-none p-4 rounded-xl focus:ring-1 focus:ring-slate-900 outline-none text-center text-xl font-bold transition-shadow" 
                      placeholder={t.placeholders.uni}
                      value={university} 
                      onChange={e => setUniversity(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.dept}</label>
                    <input 
                      required 
                      onInvalid={handleInvalid}
                      onInput={handleInput}
                      className="w-full bg-slate-50 border-none p-4 rounded-xl focus:ring-1 focus:ring-slate-900 outline-none text-center text-xl font-bold transition-shadow" 
                      placeholder={t.placeholders.dept}
                      value={department} 
                      onChange={e => setDepartment(e.target.value)} 
                    />
                  </div>
                  <div className="flex gap-4">
                    <button type="button" onClick={() => handleStepTransition(Step.Profile)} className="flex-1 border border-slate-200 py-5 rounded-xl font-bold hover:bg-slate-50 transition-all uppercase tracking-widest text-xs">{t.back}</button>
                    <button type="submit" className="flex-[2] bg-slate-900 text-white py-5 rounded-xl font-bold hover:bg-slate-800 transition-all uppercase tracking-widest text-xs shadow-lg shadow-slate-100">
                      {t.scan}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {currentStep === Step.Results && (
              <div className="animate-in fade-in duration-500">
                <div className="mb-16">
                  <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">{t.step3}</h2>
                  <p className="text-slate-400 text-sm font-medium">{t.results_sub}</p>
                </div>

                {[1, 2, 3].map(tier => {
                  const tierProfs = professors.filter(p => p.tier === tier);
                  if (tierProfs.length === 0) return null;
                  const allGenerated = tierProfs.every(p => p.draftStatus === 'completed');

                  return (
                    <div key={tier} className="mb-16">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 border-b border-slate-100 pb-4 gap-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">
                          {t.tier_pre} {tier}: {tier === 1 ? t.tier_1 : tier === 2 ? t.tier_2 : t.tier_3}
                        </h3>
                        <div className="flex gap-2">
                          <button 
                            disabled={bulkProcessing}
                            onClick={() => handleBulkGenerate(tier as 1|2|3)} 
                            className="text-[9px] font-bold uppercase tracking-widest border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-full transition-all disabled:opacity-50"
                          >
                            {t.bulk}
                          </button>
                          {allGenerated && (
                            <button 
                              onClick={() => handleExportTier(tier as 1|2|3)} 
                              className="text-[9px] font-bold uppercase tracking-widest bg-slate-900 text-white px-4 py-2 rounded-full transition-all hover:bg-slate-800"
                            >
                              <i className="fas fa-file-word mr-1"></i> {t.exportWord}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-slate-100">
                        {tierProfs.map((prof, idx) => (
                          <div key={idx} className="bg-white border-r border-b border-slate-100 p-8 flex flex-col justify-between hover:bg-slate-50 transition-all group">
                            <div>
                              <div className="flex justify-between items-start mb-4">
                                <h4 className="font-bold text-slate-900 group-hover:text-black transition-colors">{prof.name}</h4>
                                <span className="text-[9px] font-black border border-slate-200 px-2 py-1 rounded-md">{prof.matchScore}%</span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase mb-4 truncate">{prof.researchInterests.join(' • ')}</p>
                              <p className="text-xs text-slate-500 leading-relaxed mb-8 line-clamp-3">{prof.matchReason}</p>
                            </div>
                            <div className="mt-6 flex items-center justify-between">
                              <button 
                                onClick={() => handleSelectProfessor(prof)}
                                className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
                              >
                                {t.view_draft}
                              </button>
                              {prof.draftStatus === 'loading' && <i className="fas fa-circle-notch fa-spin text-slate-300 text-[10px]"></i>}
                              {prof.draftStatus === 'completed' && <i className="fas fa-check-circle text-green-500 text-[10px]"></i>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                
                {sources.length > 0 && (
                  <div className="mt-12 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Verification Sources</h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {sources.map((source, i) => (
                        <li key={i} className="text-[10px] truncate">
                          <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-slate-900 hover:underline flex items-center gap-2">
                            <i className="fas fa-external-link-alt text-[8px]"></i>
                            {source.title || source.uri}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {currentStep === Step.Draft && selectedProf && emailDraft && (
              <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-12">
                  <button onClick={() => handleStepTransition(Step.Results)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900">
                    <i className="fas fa-arrow-left mr-2"></i> {t.back}
                  </button>
                  <div className="text-right">
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{selectedProf.name}</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t.label_prof}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-3xl p-8 md:p-12 space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.label_subject}</label>
                    <div className="bg-white p-4 rounded-xl font-bold text-slate-900 border border-slate-100">{emailDraft.subject}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="bg-white p-8 md:p-12 rounded-2xl text-slate-700 leading-relaxed whitespace-pre-wrap border border-slate-100 min-h-[400px]">
                      {emailDraft.body}
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`${emailDraft.subject}\n\n${emailDraft.body}`);
                        const btn = document.getElementById('copy-btn');
                        if (btn) btn.innerText = t.copy_status;
                        setTimeout(() => { if (btn) btn.innerText = t.copy; }, 2000);
                      }} 
                      id="copy-btn"
                      className="flex-1 bg-slate-900 text-white py-5 rounded-xl font-bold hover:bg-slate-800 transition-all uppercase tracking-widest text-xs shadow-lg shadow-slate-100"
                    >
                      {t.copy}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {isLoading && (
          <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="w-12 h-12 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin mb-6"></div>
            <p className="text-sm font-bold text-slate-900 uppercase tracking-widest animate-pulse">{loadingText}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">{loadingEstimate}</p>
          </div>
        )}

        {showTutorial && (
          <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[40px] p-8 md:p-16 relative overflow-hidden animate-in zoom-in duration-500">
              <button onClick={() => setShowTutorial(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-900 transition-colors">
                <i className="fas fa-times text-2xl"></i>
              </button>
              <h2 className="text-4xl font-bold text-slate-900 tracking-tighter mb-12">{t.tutorial}</h2>
              <div className="space-y-10">
                {t.tutorial_steps.map((step, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="text-slate-200 text-4xl font-black italic">0{i+1}</div>
                    <div>
                      <h4 className="font-bold text-slate-900 mb-2 uppercase tracking-widest text-[11px]">{step.title}</h4>
                      <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowTutorial(false)} className="mt-12 w-full bg-slate-900 text-white py-5 rounded-2xl font-bold hover:bg-slate-800 transition-all uppercase tracking-widest text-xs">
                {t.close}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default App;
