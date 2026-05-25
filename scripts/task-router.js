const ROUTES = {
  COUNCIL: 'council',
  SEVEN_SAMURAI: 'seven_samurai',
  SKILL: 'skill',
  DIRECTOR_DECIDE: 'director_decide'
};

function cleanTitle(title) {
  return String(title || '').trim();
}

function classifyTask(title) {
  const value = cleanTitle(title);
  const isEvaluation = /评估|是否值得|要不要做|值不值得|判断|分析|议题|讨论/.test(value);
  const isExecution = /执行|产出|生成|写作|撰写|整理|制作|完成|处理/.test(value);
  const isSkillLike = /skill|技能|封面|转文字|url|markdown|小红书发布|飞书文档/i.test(value);

  if (/^【十二怒汉议题】/.test(value) || /^十二怒汉[：:]/.test(value)) {
    return {
      routeStage: '识别层',
      route: ROUTES.COUNCIL,
      routeLabel: '十二怒汉',
      routePlan: '先识别，再讨论',
      routeReason: '标题要求先做方向判断，由十二怒汉讨论后再决定是否交给七武士。'
    };
  }

  if (/^【七武士任务】/.test(value) || /^七武士[：:]/.test(value) || (isExecution && !isEvaluation && !isSkillLike)) {
    return {
      routeStage: '识别层',
      route: ROUTES.SEVEN_SAMURAI,
      routeLabel: '七武士',
      routePlan: '先识别，再执行',
      routeReason: '标题要求直接执行，由虾老大调度七武士产出结果。'
    };
  }

  if (/^【Skill】/i.test(value) || /^【技能】/.test(value) || /^Skill[：:]/i.test(value) || isSkillLike) {
    return {
      routeStage: '识别层',
      route: ROUTES.SKILL,
      routeLabel: 'Skill',
      routePlan: '先识别，再调用技能',
      routeReason: '标题要求走固定技能流程，优先匹配已有 skill。'
    };
  }

  if (isEvaluation) {
    return {
      routeStage: '识别层',
      route: ROUTES.COUNCIL,
      routeLabel: '十二怒汉',
      routePlan: '先识别，再讨论',
      routeReason: '标题语义是评估/判断类任务，先进入十二怒汉做方向判断。'
    };
  }

  return {
    routeStage: '识别层',
    route: ROUTES.DIRECTOR_DECIDE,
    routeLabel: '虾老大判断',
    routePlan: '先识别，再由虾老大分流',
    routeReason: '没有指定路线，先由虾老大判断该走十二怒汉、七武士还是 Skill。'
  };
}

module.exports = {
  ROUTES,
  classifyTask
};
