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

  if (/^【十二怒汉议题】/.test(value) || /^十二怒汉[：:]/.test(value)) {
    return {
      route: ROUTES.COUNCIL,
      routeLabel: '十二怒汉',
      routeReason: '标题要求先做方向判断，由十二怒汉讨论后再决定是否交给七武士。'
    };
  }

  if (/^【七武士任务】/.test(value) || /^七武士[：:]/.test(value)) {
    return {
      route: ROUTES.SEVEN_SAMURAI,
      routeLabel: '七武士',
      routeReason: '标题要求直接执行，由虾老大调度七武士产出结果。'
    };
  }

  if (/^【Skill】/i.test(value) || /^【技能】/.test(value) || /^Skill[：:]/i.test(value)) {
    return {
      route: ROUTES.SKILL,
      routeLabel: 'Skill',
      routeReason: '标题要求走固定技能流程，优先匹配已有 skill。'
    };
  }

  return {
    route: ROUTES.DIRECTOR_DECIDE,
    routeLabel: '虾老大判断',
    routeReason: '没有指定路线，先由虾老大判断该走十二怒汉、七武士还是 Skill。'
  };
}

module.exports = {
  ROUTES,
  classifyTask
};
