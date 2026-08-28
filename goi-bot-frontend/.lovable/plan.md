# תוכנית השקה — סקירה מסודרת פאנל אחרי פאנל

## איך נעבוד

לכל מסך נבדוק שלוש שאלות:
1. **עובד?** — לוגיקה, כפתורים, קריאות שרת, realtime, הרשאות.
2. **חסר / יותר מדי?** — האם יש שדות חסרים לחוויית משתמש, או להפך — עומס מיותר.
3. **עיצוב וחוויה?** — RTL, מובייל, טעינות, מצבי ריק, שגיאות ידידותיות.

בסוף כל מסך אתן לך: ✅ מוכן / ⚠️ תיקונים קטנים / ❌ צריך עבודה.
בסוף כל פאנל — סיכום ואישור שלך לפני שממשיכים לבא.

---

## סדר הפאנלים (מהקריטי לפחות)

**1. שליח (Courier)** — הכי קריטי, כל המערכת עומדת עליהם.
**2. עסק (Business)** — הלקוח המשלם, חייב להיות חלק.
**3. לקוח פרטי (Customer)** — משיק חדש, פחות מסכים.
**4. מנהל (Admin)** — פנימי, יכול להיות פחות מלוטש.
**5. ציבורי / שיווקי** — נחיתה, בלוג, טפסי הצטרפות.

---

## פאנל 1 — שליח (15 מסכים)

```text
courier/new-jobs         משלוחים חדשים + מפה + הצעות
courier/accepted-jobs    משלוחים שאישרתי
courier/active           משלוח פעיל (הראשי — מפה + סטטוסים)
courier/multi-stop/$id   משלוח רב־עצירות
courier/history          היסטוריה
courier/my-quotes        הצעות מחיר שלי
courier/messages         צ'אטים
courier/notifications    התראות
courier/wallet           ארנק ומשיכות
courier/ratings          דירוגים
courier/availability     זמינות + שעות שקטות
courier/dashboard        דאשבורד ראשי
courier/profile          פרופיל + עריכה
courier/account-settings הגדרות חשבון
courier/login + reset    התחברות + איפוס סיסמה
```

## פאנל 2 — עסק (23 מסכים)

```text
business/new-delivery        שידור משלוח בודד (הראשי)
business/new-multi-delivery  משלוח מרובה עצירות
business/new-route           מסלול
business/new-shift           משמרת
business/active              משלוחים פעילים
business/orders + order/$id  היסטוריית הזמנות + פרטי הזמנה
business/track/$id           מעקב חי
business/quotes              הצעות מחיר
business/recurring-orders    הזמנות חוזרות
business/contacts            אנשי קשר / נמענים
business/addresses           כתובות שמורות
business/team                חברי צוות
business/messages            צ'אטים
business/notifications       התראות + push
business/wallet + billing    ארנק + חיובים
business/analytics           אנליטיקה
business/integrations        חיבורים חיצוניים
business/profile + account   פרופיל וחשבון
business/settings            הגדרות
business/support + help      תמיכה ועזרה
business/dashboard           דאשבורד
```

## פאנל 3 — לקוח פרטי (12 מסכים)

```text
customer/new-order       הזמנת משלוח (הראשי — booking flow)
customer/dashboard       דאשבורד
customer/orders          היסטוריה
customer/order/$id       פרטי הזמנה + מעקב
customer/activity        פעילות אחרונה
customer/chat + $jobId   צ'אטים
customer/account         אזור אישי (כולל push)
customer/profile         פרטים אישיים
customer/referrals       הזמן חבר
customer/help            עזרה
customer/login           התחברות
```

## פאנל 4 — מנהל (23 מסכים)

```text
_authenticated/dashboard              דאשבורד
jobs / send-job                       ניהול משלוחים
couriers-admin / couriers/$id         שליחים + פרופיל
couriers-map                          מפת שליחים חיה
couriers.bank-details                 פרטי בנק לחשבוניות
businesses / businesses/$id           עסקים
customers                             לקוחות פרטיים
messages                              צ'אטי תמיכה
quote-requests                        בקשות הצעת מחיר
withdrawals                           בקשות משיכה
bonuses                               בונוסים
pricing + pricing-rules               תמחור
areas-tags                            אזורים ותגים
pilot-cities                          ערי פיילוט
dispatch-groups                       קבוצות ווצאפ לשליחים
whatsapp-provider                     ספק ווצאפ
courier-notifications                 שליחת התראות
admin-assistant + $threadId + guide   העוזר החכם
reports                               דוחות
launch-readiness                      מוכנות להשקה
settings                              הגדרות כלליות
```

## פאנל 5 — ציבורי / שיווקי (10 מסכים)

```text
/                        דף בית
for-business             דף עסקים
couriers                 דף שליחים (גיוס)
drivers                  דף מובילים
join                     טופס הצטרפות
signup-business          הרשמת עסק
blog + blog/$slug        בלוג
express/$serviceType     דפי שירות אקספרס
clinic / restaurant / store  דפי נישה
track/$token + munch/track  מעקב לאורח (ללא התחברות)
order/$token             הזמנת אורח
r                        redirect / referral
```

---

## מה נבדוק לכל מסך (checklist טכני)

- ✅ טעינה ראשונית + מצב אין־נתונים (empty state)
- ✅ כל הכפתורים באמת עושים משהו (לא dead code)
- ✅ realtime מתעדכן (משלוחים, הודעות, סטטוסים)
- ✅ push notifications מגיעים
- ✅ הרשאות RLS — משתמש לא רואה מה שאסור
- ✅ מובייל 390px (זה מה שרוב המשתמשים יראו)
- ✅ RTL תקין — טקסטים, אייקונים, כיווניות
- ✅ שגיאות מוצגות בעברית ידידותית, לא stack trace
- ✅ טעינות (skeletons) במקום קפיצות פתאום

---

## איך מתחילים

מציע: **פאנל שליח → מסך `courier/new-jobs`** (זה הלב של המערכת — בלי שהשליח רואה משלוחים ולוקח אותם, כלום לא עובד).

אני אפתח את המסך, אעבור עליו איתך:
- אריץ אותו בדפדפן ואצלם
- אקרא את הקוד שלו
- אשלוף נתונים אמיתיים מה־DB לראות שהכל זורם
- אתן לך רשימת ממצאים ב־3 קטגוריות (עובד / חסר-יתר / עיצוב)
- אתה מאשר תיקונים → אני מבצע → אתה מאשר סגירת המסך
- עוברים למסך הבא

**אישור שלך על הסדר הזה, או שאתה רוצה להתחיל מפאנל אחר / להוסיף מסך שפספסתי?**
