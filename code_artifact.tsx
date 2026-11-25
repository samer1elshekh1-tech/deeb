import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  KeyRound,
  TrendingUp,
  Plus,
  Video,
  Clock,
  CheckCircle2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  Search,
  Trash2,
  ShieldCheck,
  Award,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

// ============================================================================
// ثوابت التخزين والمزامنة بين التبويبات (localStorage + URL Hash)
// ============================================================================

const STORAGE_KEY = 'tafawoq_platform_state_v1';

const DEFAULT_COURSES = [
  {
    id: 'course-physics-3sec',
    title: 'الفيزياء الحديثة والكهربية - الصف الثالث الثانوي',
    subject: 'الفيزياء',
    price: 350,
    studentsCount: 412,
    published: true,
    lessons: [
      { id: 'les-1', title: 'التيار الكهربي وقانون أوم للدوائر المغلقة', duration: '46:15', published: true },
      { id: 'les-2', title: 'توصيل المقاومات على التوالي والتوازي وأفكار الاختزال', duration: '54:20', published: true },
      { id: 'les-3', title: 'قانونا كيرشوف وحل المسائل بالآلة الحاسبة', duration: '61:05', published: false }
    ]
  },
  {
    id: 'course-math-3sec',
    title: 'المراجعة النهائية في التفاضل والتكامل - 3 ثانوي',
    subject: 'الرياضيات',
    price: 400,
    studentsCount: 289,
    published: true,
    lessons: [
      { id: 'les-4', title: 'قواعد الاشتقاق والدوال المثلثية والأسية', duration: '49:30', published: true },
      { id: 'les-5', title: 'المعدلات الزمنية المرتبطة والقيم العظمى والصغرى', duration: '58:10', published: true }
    ]
  },
  {
    id: 'course-chem-3sec',
    title: 'الكيمياء العضوية من الصفر إلى الاحتراف',
    subject: 'الكيمياء',
    price: 300,
    studentsCount: 198,
    published: false,
    lessons: [
      { id: 'les-6', title: 'مدخل الكيمياء العضوية والمشابهة الجزيئية (الأيزومرات)', duration: '41:00', published: true }
    ]
  }
];

const DEFAULT_CODES = [
  {
    id: 'code-1',
    code: 'TAFAWOQ-2026',
    courseId: 'course-physics-3sec',
    courseTitle: 'الفيزياء الحديثة والكهربية - الصف الثالث الثانوي',
    used: false,
    usedBy: null,
    createdAt: 'اليوم، 09:15 ص'
  },
  {
    id: 'code-2',
    code: 'MATH-8080',
    courseId: 'course-math-3sec',
    courseTitle: 'المراجعة النهائية في التفاضل والتكامل - 3 ثانوي',
    used: false,
    usedBy: null,
    createdAt: 'أمس، 06:40 م'
  },
  {
    id: 'code-3',
    code: 'PHYS-4410',
    courseId: 'course-physics-3sec',
    courseTitle: 'الفيزياء الحديثة والكهربية - الصف الثالث الثانوي',
    used: true,
    usedBy: 'يوسف طارق محمود',
    createdAt: 'منذ 3 أيام'
  }
];

const DEFAULT_STUDENTS = [
  {
    id: 'stu-1',
    name: 'يوسف طارق محمود',
    phone: '01012345678',
    courseTitle: 'الفيزياء الحديثة والكهربية - الصف الثالث الثانوي',
    quizScore: 95,
    completion: 88,
    lastActive: 'منذ 15 دقيقة'
  },
  {
    id: 'stu-2',
    name: 'مريم خالد إبراهيم',
    phone: '01198765432',
    courseTitle: 'المراجعة النهائية في التفاضل والتكامل - 3 ثانوي',
    quizScore: 91,
    completion: 76,
    lastActive: 'منذ ساعة'
  },
  {
    id: 'stu-3',
    name: 'عمر حسام الدين',
    phone: '01234567890',
    courseTitle: 'الفيزياء الحديثة والكهربية - الصف الثالث الثانوي',
    quizScore: 78,
    completion: 54,
    lastActive: 'اليوم، 02:10 م'
  },
  {
    id: 'stu-4',
    name: 'نور محمد سعيد',
    phone: '01555443322',
    courseTitle: 'الكيمياء العضوية من الصفر إلى الاحتراف',
    quizScore: 98,
    completion: 100,
    lastActive: 'منذ 3 ساعات'
  },
  {
    id: 'stu-5',
    name: 'آدم كريم حسن',
    phone: '01099887766',
    courseTitle: 'المراجعة النهائية في التفاضل والتكامل - 3 ثانوي',
    quizScore: 84,
    completion: 65,
    lastActive: 'أمس'
  }
];

// ============================================================================
// أدوات التوجيه عبر URL Query & Hash والمزامنة الحية
// ============================================================================

function parseRouteMode() {
  try {
    const params = new URLSearchParams(window.location.search);
    const queryView = (params.get('view') || '').toLowerCase();
    const hashRaw = (window.location.hash || '').replace(/^#/, '').toLowerCase();

    if (queryView === 'student' || hashRaw === 'student' || hashRaw.startsWith('student')) {
      return 'student';
    }
    if (queryView === 'teacher' || hashRaw === 'teacher' || hashRaw.startsWith('teacher')) {
      return 'teacher';
    }
    return 'teacher';
  } catch {
    return 'teacher';
  }
}

function encodeStateToHash(payload) {
  try {
    const jsonStr = JSON.stringify(payload);
    // ترميز UTF-8 آمن لـ Base64URL داخل الهاش
    const bytes = new TextEncoder().encode(jsonStr);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64url = btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    // تقليص الطول لتجنب تجاوز حدود URL في بعض المتصفحات
    if (base64url.length > 14000) return null;
    return base64url;
  } catch {
    return null;
  }
}

function decodeStateFromHash() {
  try {
    const hash = window.location.hash || '';
    const match = hash.match(/state=([A-Za-z0-9\-_]+)/);
    if (!match || !match[1]) return null;

    let base64 = match[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const jsonStr = new TextDecoder().decode(bytes);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function loadInitialPlatformData() {
  const fromHash = decodeStateFromHash();
  if (fromHash && Array.isArray(fromHash.courses) && Array.isArray(fromHash.codes)) {
    return {
      courses: fromHash.courses,
      codes: fromHash.codes,
      students: Array.isArray(fromHash.students) ? fromHash.students : DEFAULT_STUDENTS
    };
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.courses) && Array.isArray(parsed.codes)) {
        return {
          courses: parsed.courses,
          codes: parsed.codes,
          students: Array.isArray(parsed.students) ? parsed.students : DEFAULT_STUDENTS
        };
      }
    }
  } catch (err) {
    console.error('خطأ في قراءة بيانات المنصة من التخزين المحلي:', err);
  }

  return {
    courses: DEFAULT_COURSES,
    codes: DEFAULT_CODES,
    students: DEFAULT_STUDENTS
  };
}

function buildPortalUrl(mode, stateSnapshot) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('view', mode);
    const encoded = stateSnapshot ? encodeStateToHash(stateSnapshot) : null;
    url.hash = encoded ? `${mode}&state=${encoded}` : mode;
    return url.toString();
  } catch {
    return `?view=${mode}#${mode}`;
  }
}

// ============================================================================
// المكون الرئيسي للوحة تحكم المعلم
// ============================================================================

export default function App() {
  const initialRoute = useMemo(() => parseRouteMode(), []);
  const initialData = useMemo(() => loadInitialPlatformData(), []);

  const [routeMode, setRouteMode] = useState(initialRoute); // 'teacher' | 'student'
  const [activeTab, setActiveTab] = useState('courses'); // 'courses' | 'codes' | 'students'

  const [courses, setCourses] = useState(initialData.courses);
  const [codes, setCodes] = useState(initialData.codes);
  const [students] = useState(initialData.students);

  // نماذج إضافة الكورسات والدروس
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseSubject, setNewCourseSubject] = useState('الفيزياء');
  const [newCoursePrice, setNewCoursePrice] = useState('350');

  const [selectedCourseIdForLesson, setSelectedCourseIdForLesson] = useState(
    initialData.courses[0]?.id || ''
  );
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonDuration, setNewLessonDuration] = useState('45:00');

  // نموذج توليد أكواد التفعيل (مخصص أو عشوائي)
  const [selectedCourseIdForCode, setSelectedCourseIdForCode] = useState(
    initialData.courses[0]?.id || ''
  );
  const [codeMode, setCodeMode] = useState('random'); // 'random' | 'custom'
  const [customCodeInput, setCustomCodeInput] = useState('TAFAWOQ-2026');
  const [batchQuantity, setBatchQuantity] = useState(1);
  const [copiedCodeId, setCopiedCodeId] = useState(null);

  // بحث في جدول الطلاب
  const [studentSearch, setStudentSearch] = useState('');

  // إشعار الحالة
  const [toast, setToast] = useState(null);

  const notify = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3200);
  }, []);

  // مزامنة الحالة مع localStorage و URL Hash تلقائياً
  useEffect(() => {
    const snapshot = { courses, codes, students };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (err) {
      console.error('تعذر حفظ البيانات في localStorage:', err);
    }

    try {
      const encoded = encodeStateToHash(snapshot);
      const nextHash = encoded ? `${routeMode}&state=${encoded}` : routeMode;
      if (window.location.hash !== `#${nextHash}`) {
        window.history.replaceState(null, '', `?view=${routeMode}#${nextHash}`);
      }
    } catch {
      // تجاهل أخطاء بيئات المعاينة المقيدة
    }
  }, [courses, codes, students, routeMode]);

  // الاستماع لتغييرات التبويبات الأخرى أو تغيير الهاش/الاستعلام في المتصفح
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          if (Array.isArray(parsed.courses)) setCourses(parsed.courses);
          if (Array.isArray(parsed.codes)) setCodes(parsed.codes);
        } catch {
          // تجاهل البيانات غير الصالحة
        }
      }
    };

    const handleHashOrPop = () => {
      const nextMode = parseRouteMode();
      setRouteMode(nextMode);
      const fromHash = decodeStateFromHash();
      if (fromHash && Array.isArray(fromHash.courses)) {
        setCourses(fromHash.courses);
      }
      if (fromHash && Array.isArray(fromHash.codes)) {
        setCodes(fromHash.codes);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('hashchange', handleHashOrPop);
    window.addEventListener('popstate', handleHashOrPop);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('hashchange', handleHashOrPop);
      window.removeEventListener('popstate', handleHashOrPop);
    };
  }, []);

  // الانتقال بين أوضاع التوجيه (?view=teacher / ?view=student)
  const switchRouteMode = (mode) => {
    setRouteMode(mode);
    try {
      const snapshot = { courses, codes, students };
      const encoded = encodeStateToHash(snapshot);
      const nextHash = encoded ? `${mode}&state=${encoded}` : mode;
      window.history.pushState(null, '', `?view=${mode}#${nextHash}`);
    } catch {
      window.location.hash = `#${mode}`;
    }
  };

  // فتح منصة الطالب في تبويب جديد مع تمرير الحالة الحية
  const openStudentPortalInNewTab = () => {
    const targetUrl = buildPortalUrl('student', { courses, codes, students });
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  // ==========================================================================
  // حساب مؤشرات الأداء الرئيسية (KPIs)
  // ==========================================================================

  const kpis = useMemo(() => {
    const totalStudents = courses.reduce((sum, c) => sum + (Number(c.studentsCount) || 0), 0);
    const activeCourses = courses.filter((c) => c.published).length;
    const generatedCodesCount = codes.length;
    const avgQuizScore =
      students.length > 0
        ? (students.reduce((sum, s) => sum + Number(s.quizScore || 0), 0) / students.length).toFixed(1)
        : '0.0';

    return {
      totalStudents,
      activeCourses,
      generatedCodesCount,
      avgQuizScore
    };
  }, [courses, codes, students]);

  // ==========================================================================
  // إدارة الكورسات والدروس وحالة النشر / المسودة
  // ==========================================================================

  const handleCreateCourse = (e) => {
    e.preventDefault();
    const trimmedTitle = newCourseTitle.trim();
    if (!trimmedTitle) return;

    const newCourse = {
      id: `course-${Date.now()}`,
      title: trimmedTitle,
      subject: newCourseSubject,
      price: Math.max(0, Number(newCoursePrice) || 0),
      studentsCount: 0,
      published: true,
      lessons: []
    };

    setCourses((prev) => [newCourse, ...prev]);
    setSelectedCourseIdForLesson(newCourse.id);
    setSelectedCourseIdForCode(newCourse.id);
    setNewCourseTitle('');
    notify('تم إنشاء الكورس الجديد وحفظه تلقائياً.');
  };

  const toggleCoursePublished = (courseId) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, published: !c.published } : c))
    );
    notify('تم تحديث حالة الكورس (منشور / مسودة).');
  };

  const handleDeleteCourse = (courseId) => {
    setCourses((prev) => {
      const remaining = prev.filter((c) => c.id !== courseId);
      if (selectedCourseIdForLesson === courseId) {
        setSelectedCourseIdForLesson(remaining[0]?.id || '');
      }
      if (selectedCourseIdForCode === courseId) {
        setSelectedCourseIdForCode(remaining[0]?.id || '');
      }
      return remaining;
    });
    notify('تم حذف الكورس.', 'info');
  };

  const handleAddLesson = (e) => {
    e.preventDefault();
    const trimmedTitle = newLessonTitle.trim();
    if (!trimmedTitle || !selectedCourseIdForLesson) return;

    const newLesson = {
      id: `les-${Date.now()}`,
      title: trimmedTitle,
      duration: newLessonDuration.trim() || '40:00',
      published: true
    };

    setCourses((prev) =>
      prev.map((c) =>
        c.id === selectedCourseIdForLesson
          ? { ...c, lessons: [...c.lessons, newLesson] }
          : c
      )
    );

    setNewLessonTitle('');
    notify('تمت إضافة الدرس الجديد إلى الكورس.');
  };

  const toggleLessonPublished = (courseId, lessonId) => {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c;
        return {
          ...c,
          lessons: c.lessons.map((l) =>
            l.id === lessonId ? { ...l, published: !l.published } : l
          )
        };
      })
    );
    notify('تم تبديل حالة الدرس بين منشور ومسودة.');
  };

  // ==========================================================================
  // مولّد أكواد التفعيل (مخصص أو عشوائي)
  // ==========================================================================

  const generateRandomCodeString = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let part1 = '';
    let part2 = '';
    for (let i = 0; i < 4; i++) {
      part1 += chars.charAt(Math.floor(Math.random() * chars.length));
      part2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `TFQ-${part1}-${part2}`;
  };

  const handleGenerateActivationCodes = (e) => {
    e.preventDefault();
    const targetCourse = courses.find((c) => c.id === selectedCourseIdForCode) || courses[0];
    if (!targetCourse) {
      notify('يرجى إنشاء كورس أولاً قبل توليد أكواد التفعيل.', 'error');
      return;
    }

    if (codeMode === 'custom') {
      const normalized = customCodeInput.trim().toUpperCase().replace(/\s+/g, '-');
      if (!normalized) {
        notify('يرجى إدخال كود مخصص صالح.', 'error');
        return;
      }

      const duplicate = codes.some((item) => item.code.toUpperCase() === normalized);
      if (duplicate) {
        notify(`الكود "${normalized}" موجود بالفعل في القائمة.`, 'error');
        return;
      }

      const createdCustom = {
        id: `code-${Date.now()}`,
        code: normalized,
        courseId: targetCourse.id,
        courseTitle: targetCourse.title,
        used: false,
        usedBy: null,
        createdAt: 'الآن (مخصص)'
      };

      setCodes((prev) => [createdCustom, ...prev]);
      notify(`تم إنشاء الكود المخصص ${normalized} بنجاح.`);
      return;
    }

    const count = Math.min(20, Math.max(1, Number(batchQuantity) || 1));
    const generatedBatch = [];
    const existingSet = new Set(codes.map((c) => c.code.toUpperCase()));

    for (let i = 0; i < count; i++) {
      let candidate = generateRandomCodeString();
      while (existingSet.has(candidate)) {
        candidate = generateRandomCodeString();
      }
      existingSet.add(candidate);

      generatedBatch.push({
        id: `code-${Date.now()}-${i}`,
        code: candidate,
        courseId: targetCourse.id,
        courseTitle: targetCourse.title,
        used: false,
        usedBy: null,
        createdAt: 'الآن'
      });
    }

    setCodes((prev) => [...generatedBatch, ...prev]);
    notify(`تم توليد ${count} ${count === 1 ? 'كود تفعيل' : 'أكواد تفعيل'} جديدة.`);
  };

  const handleCopyCode = async (codeObj) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(codeObj.code);
      }
    } catch {
      // استمرار إظهار حالة النسخ حتى في البيئات المعزولة
    }
    setCopiedCodeId(codeObj.id);
    notify(`تم نسخ الكود: ${codeObj.code}`);
    setTimeout(() => setCopiedCodeId(null), 1800);
  };

  // تصفية جدول الطلاب
  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.courseTitle.toLowerCase().includes(q) ||
        s.phone.includes(q)
    );
  }, [students, studentSearch]);

  // ==========================================================================
  // عرض معاينة مختصرة عند التبديل إلى وضع الطالب (?view=student)
  // ==========================================================================

  if (routeMode === 'student') {
    const publishedCourses = courses.filter((c) => c.published);
    const activeCodes = codes.filter((c) => !c.used);

    return (
      <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black text-slate-900">منصة الطالب — تفوّق</h1>
                <p className="text-[11px] text-slate-500">عرض الطالب المتزامن عبر المسار (?view=student)</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => switchRouteMode('teacher')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>العودة إلى لوحة المعلم</span>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="bg-gradient-to-l from-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <span className="inline-block text-xs font-extrabold px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 mb-2">
                مزامنة مباشرة مع لوحة المعلم
              </span>
              <h2 className="text-2xl font-black">الكورسات المنشورة وأكواد التفعيل المتاحة</h2>
              <p className="text-slate-300 text-sm mt-1">
                أي كورس أو درس ينشره المعلم أو كود يولّده يظهر هنا مباشرة عبر التخزين المحلي وهاش الرابط.
              </p>
            </div>
            <button
              onClick={() => switchRouteMode('teacher')}
              className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shrink-0"
            >
              إدارة المحتوى في لوحة المعلم
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-black text-slate-900">الكورسات المنشورة ({publishedCourses.length})</h3>
              {publishedCourses.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
                  لا توجد كورسات منشورة حالياً. قم بنشر كورس من لوحة تحكم المعلم.
                </div>
              ) : (
                publishedCourses.map((course) => {
                  const visibleLessons = course.lessons.filter((l) => l.published);
                  return (
                    <div key={course.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700">
                          {course.subject}
                        </span>
                        <span className="text-sm font-black text-slate-900">{course.price} ج.م</span>
                      </div>
                      <h4 className="text-lg font-black text-slate-900">{course.title}</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        الدروس المنشورة للطلاب: <strong>{visibleLessons.length}</strong> من {course.lessons.length}
                      </p>
                      <div className="mt-4 space-y-2">
                        {visibleLessons.map((lesson, idx) => (
                          <div
                            key={lesson.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs sm:text-sm"
                          >
                            <span className="font-bold text-slate-800">
                              {idx + 1}. {lesson.title}
                            </span>
                            <span className="text-slate-500 font-mono">{lesson.duration}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
              <h3 className="text-base font-black text-slate-900 mb-3 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-500" />
                <span>أكواد التفعيل النشطة ({activeCodes.length})</span>
              </h3>
              <div className="space-y-2.5">
                {activeCodes.map((c) => (
                  <div key={c.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <code className="text-sm font-black text-indigo-700 block">{c.code}</code>
                    <span className="text-[11px] text-slate-500 block mt-0.5">{c.courseTitle}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ==========================================================================
  // الواجهة الرئيسية المستقلة للوحة تحكم المعلم (?view=teacher أو #teacher)
  // ==========================================================================

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-600 selection:text-white">
      {/* شريط التنقل العلوي ومبدّل التوجيه السريع */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* هوية بوابة المعلم */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-900">لوحة تحكم المعلم</h1>
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  ?view=teacher
                </span>
              </div>
              <p className="text-xs text-slate-500">منصة تفوّق التعليمية — إدارة المحتوى والأكواد والطلاب</p>
            </div>
          </div>

          {/* مبدّل التنقل السريع ورابط فتح منصة الطالب */}
          <div className="flex flex-wrap items-center justify-center gap-2 w-full md:w-auto">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => switchRouteMode('teacher')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-white text-indigo-700 shadow-sm"
              >
                لوحة المعلم
              </button>
              <button
                type="button"
                onClick={() => switchRouteMode('student')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
              >
                معاينة الطالب
              </button>
            </div>

            <button
              type="button"
              onClick={openStudentPortalInNewTab}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              title="فتح منصة الطالب في نافذة جديدة بمزامنة حية"
            >
              <BookOpen className="w-4 h-4" />
              <span>فتح منصة الطالب</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* شريط الإشعارات الفورية */}
      {toast && (
        <div className="fixed bottom-5 left-5 z-50 max-w-md bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3">
          {toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-bold">{toast.message}</span>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* بطاقات مؤشرات الأداء الرئيسية (KPI Cards) */}
        <section aria-label="مؤشرات الأداء الرئيسية" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs sm:text-sm font-bold text-slate-500">إجمالي الطلاب</span>
              <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </span>
            </div>
            <p className="text-3xl font-black text-slate-900">{kpis.totalStudents.toLocaleString('ar-EG')}</p>
            <p className="text-xs text-emerald-600 font-bold mt-1.5">طالب مسجل عبر الكورسات</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs sm:text-sm font-bold text-slate-500">الكورسات النشطة</span>
              <span className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                <Video className="w-5 h-5" />
              </span>
            </div>
            <p className="text-3xl font-black text-slate-900">{kpis.activeCourses}</p>
            <p className="text-xs text-slate-500 font-medium mt-1.5">
              من إجمالي {courses.length} كورسات في المنصة
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs sm:text-sm font-bold text-slate-500">أكواد التفعيل المُولّدة</span>
              <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </span>
            </div>
            <p className="text-3xl font-black text-slate-900">{kpis.generatedCodesCount}</p>
            <p className="text-xs text-amber-700 font-bold mt-1.5">
              متاح منها {codes.filter((c) => !c.used).length} كود للاستخدام
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs sm:text-sm font-bold text-slate-500">متوسط درجات الامتحانات</span>
              <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </span>
            </div>
            <p className="text-3xl font-black text-slate-900">{kpis.avgQuizScore}%</p>
            <p className="text-xs text-emerald-600 font-bold mt-1.5">معدل أداء الطلاب في الاختبارات</p>
          </div>
        </section>

        {/* شريط التنقل بين أقسام لوحة المعلم */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('courses')}
              className={`px-4 py-2.5 rounded-xl text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'courses'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>إدارة الكورسات والدروس</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('codes')}
              className={`px-4 py-2.5 rounded-xl text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'codes'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>مولّد أكواد التفعيل</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('students')}
              className={`px-4 py-2.5 rounded-xl text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'students'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>نتائج ونشاط الطلاب</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>حفظ تلقائي عبر التخزين المحلي والرابط</span>
          </div>
        </div>

        {/* ====================================================================
            القسم 1: إدارة الكورسات والدروس (إنشاء + تبديل منشور/مسودة)
            ==================================================================== */}
        {activeTab === 'courses' && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-7">
            {/* عمود الإنشاء السريع (5 أعمدة) */}
            <div className="lg:col-span-5 space-y-6">
              {/* إنشاء كورس جديد */}
              <form
                onSubmit={handleCreateCourse}
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4"
              >
                <div className="flex items-center gap-2 text-slate-900">
                  <Plus className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-black">إنشاء كورس جديد</h2>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">اسم الكورس</label>
                  <input
                    type="text"
                    required
                    value={newCourseTitle}
                    onChange={(e) => setNewCourseTitle(e.target.value)}
                    placeholder="مثال: مراجعة الفصل الثاني - الفيزياء"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">المادة الدراسية</label>
                    <select
                      value={newCourseSubject}
                      onChange={(e) => setNewCourseSubject(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                    >
                      <option value="الفيزياء">الفيزياء</option>
                      <option value="الرياضيات">الرياضيات</option>
                      <option value="الكيمياء">الكيمياء</option>
                      <option value="الأحياء">الأحياء</option>
                      <option value="اللغة العربية">اللغة العربية</option>
                      <option value="اللغة الإنجليزية">اللغة الإنجليزية</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">السعر (ج.م)</label>
                    <input
                      type="number"
                      min="0"
                      value={newCoursePrice}
                      onChange={(e) => setNewCoursePrice(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black transition-colors cursor-pointer"
                >
                  إضافة الكورس
                </button>
              </form>

              {/* إضافة درس جديد لكورس */}
              <form
                onSubmit={handleAddLesson}
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4"
              >
                <div className="flex items-center gap-2 text-slate-900">
                  <Video className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-lg font-black">إضافة درس جديد</h2>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">اختر الكورس</label>
                  <select
                    value={selectedCourseIdForLesson}
                    onChange={(e) => setSelectedCourseIdForLesson(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">عنوان الدرس</label>
                  <input
                    type="text"
                    required
                    value={newLessonTitle}
                    onChange={(e) => setNewLessonTitle(e.target.value)}
                    placeholder="مثال: شرح القوة المغناطيسية على سلك"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">مدة الدرس</label>
                  <input
                    type="text"
                    value={newLessonDuration}
                    onChange={(e) => setNewLessonDuration(e.target.value)}
                    placeholder="45:00"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black transition-colors cursor-pointer"
                >
                  حفظ الدرس في الكورس
                </button>
              </form>
            </div>

            {/* قائمة الكورسات والدروس مع أزرار منشور / مسودة (7 أعمدة) */}
            <div className="lg:col-span-7 space-y-4">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                          {course.subject}
                        </span>
                        <span
                          className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                            course.published
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {course.published ? 'منشور للطلاب' : 'مسودة'}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900">{course.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        السعر: <strong>{course.price} ج.م</strong> • الطلاب: <strong>{course.studentsCount}</strong> • الدروس: <strong>{course.lessons.length}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <button
                        type="button"
                        onClick={() => toggleCoursePublished(course.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                          course.published
                            ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {course.published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{course.published ? 'تحويل لمسودة' : 'نشر الكورس'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCourse(course.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                        title="حذف الكورس"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* دروس الكورس */}
                  <div className="space-y-2">
                    {course.lessons.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">لا توجد دروس مضافة لهذا الكورس بعد.</p>
                    ) : (
                      course.lessons.map((lesson, idx) => (
                        <div
                          key={lesson.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-xs font-bold flex items-center justify-center text-slate-600">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="text-xs sm:text-sm font-bold text-slate-800">{lesson.title}</p>
                              <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" />
                                <span className="font-mono">{lesson.duration}</span>
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleLessonPublished(course.id, lesson.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold self-start sm:self-center transition-colors cursor-pointer ${
                              lesson.published
                                ? 'bg-emerald-100/80 text-emerald-800 hover:bg-emerald-200/70'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }`}
                          >
                            {lesson.published ? 'منشور' : 'مسودة'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ====================================================================
            القسم 2: مولّد أكواد التفعيل (مخصص أو عشوائي + نسخ + حالة الاستخدام)
            ==================================================================== */}
        {activeTab === 'codes' && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-7">
            <form
              onSubmit={handleGenerateActivationCodes}
              className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 h-fit"
            >
              <div className="flex items-center gap-2 text-slate-900">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-black">توليد أكواد تفعيل للطلاب</h2>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">الكورس المرتبط بالكود</label>
                <select
                  value={selectedCourseIdForCode}
                  onChange={(e) => setSelectedCourseIdForCode(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">نوع الكود</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setCodeMode('random')}
                    className={`py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      codeMode === 'random'
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-600'
                    }`}
                  >
                    كود عشوائي سريع
                  </button>
                  <button
                    type="button"
                    onClick={() => setCodeMode('custom')}
                    className={`py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      codeMode === 'custom'
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-600'
                    }`}
                  >
                    كود مخصص (مثل TAFAWOQ-2026)
                  </button>
                </div>
              </div>

              {codeMode === 'custom' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">اكتب الكود المخصص</label>
                  <input
                    type="text"
                    required
                    value={customCodeInput}
                    onChange={(e) => setCustomCodeInput(e.target.value)}
                    placeholder="TAFAWOQ-2026"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">عدد الأكواد المراد توليدها</label>
                  <select
                    value={batchQuantity}
                    onChange={(e) => setBatchQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value={1}>كود واحد (1)</option>
                    <option value={3}>3 أكواد</option>
                    <option value={5}>5 أكواد</option>
                    <option value={10}>10 أكواد</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-sm font-black flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{codeMode === 'custom' ? 'إنشاء الكود المخصص' : 'توليد الأكواد الآن'}</span>
              </button>
            </form>

            {/* قائمة الأكواد وحالة الاستخدام */}
            <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-900">سجل أكواد التفعيل ({codes.length})</h2>
                <span className="text-xs font-bold text-slate-500">
                  مستخدم: {codes.filter((c) => c.used).length} • غير مستخدم: {codes.filter((c) => !c.used).length}
                </span>
              </div>

              <div className="space-y-3">
                {codes.map((item) => {
                  const isCopied = copiedCodeId === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        item.used
                          ? 'bg-slate-50 border-slate-200/80'
                          : 'bg-indigo-50/30 border-indigo-200/80'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-sm font-black text-slate-900 tracking-wide">
                            {item.code}
                          </code>
                          <span
                            className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                              item.used
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item.used ? 'مُستخدم' : 'غير مستخدم'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-semibold">{item.courseTitle}</p>
                        <p className="text-[11px] text-slate-400">
                          أُنشئ: {item.createdAt}
                          {item.used && item.usedBy ? ` • استُخدم بواسطة: ${item.usedBy}` : ''}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyCode(item)}
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 self-start sm:self-center transition-colors cursor-pointer"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span className="text-emerald-700">تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>نسخ الكود</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ====================================================================
            القسم 3: جدول نتائج ونشاط الطلاب
            ==================================================================== */}
        {activeTab === 'students' && (
          <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">نتائج ونشاط الطلاب</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  متابعة الكورسات المفعّلة، درجات الامتحانات، ونسبة إتمام المحاضرات
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="ابحث باسم الطالب أو الكورس..."
                  className="w-full pr-10 pl-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-xs font-extrabold text-slate-500 border-b border-slate-200/70">
                    <th className="py-3.5 px-6">الطالب</th>
                    <th className="py-3.5 px-6">الكورس المفعّل</th>
                    <th className="py-3.5 px-6">درجة الامتحان</th>
                    <th className="py-3.5 px-6">نسبة الإتمام</th>
                    <th className="py-3.5 px-6">آخر نشاط</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 px-6 text-center text-slate-400 text-sm">
                        لا توجد نتائج مطابقة لبحثك.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((stu) => (
                      <tr key={stu.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-6">
                          <p className="font-extrabold text-slate-900">{stu.name}</p>
                          <span className="text-xs text-slate-400 font-mono">{stu.phone}</span>
                        </td>
                        <td className="py-4 px-6 text-slate-700 font-medium">{stu.courseTitle}</td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-black ${
                              stu.quizScore >= 85
                                ? 'bg-emerald-100 text-emerald-800'
                                : stu.quizScore >= 70
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {stu.quizScore}%
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2.5">
                            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 rounded-full"
                                style={{ width: `${stu.completion}%` }}
                              />
                            </div>
                            <span className="text-xs font-extrabold text-slate-700">{stu.completion}%</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-500 font-medium">{stu.lastActive}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}