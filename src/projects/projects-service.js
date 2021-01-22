const xss = require('xss');

const ProjectsService = {
  getAllProjects(db, user_id) {
    return db
      .from('projects')
      .select(
        'projects.id',
        'projects.title',
        'projects.date_created',
        db.raw(
          `json_strip_nulls(
            json_build_object(
              'id', users.id,
              'email', users.email,
              'full_name', users.full_name,
              'nickname', users.nickname,
              'date_created', users.date_created,
              'date_modified', users.date_modified
            )
          ) AS "owner"`
        )
      )
      .leftJoin(
        'users',
        'projects.owner_id',
        'users.id'
      )
      .where('projects.owner_id', user_id);
  },
  getById(db, user_id, id) {
    return ProjectsService.getAllProjects(db, user_id)
      .andWhere('projects.id', id)
      .first();
  },
  getLogsForProject(db, user_id, project_id) {
    return db
      .from('logs')
      .select(
        'logs.id',
        'logs.start_time',
        'logs.end_time',
        'logs.project_id',
        'logs.format_min',
        'logs.format_sec',
        db.raw(
          `json_strip_nulls(
            json_build_object(
              'id', users.id,
              'email', users.email,
              'full_name', users.full_name,
              'nickname', users.nickname,
              'date_created', users.date_created,
              'date_modified', users.date_modified
            )
          ) AS "user"`
        )
      )
      .leftJoin(
        'users',
        'logs.user_id',
        'users.id'
      )
      .where('logs.project_id', project_id)
      .andWhere('logs.user_id', user_id);
  },
  getDaysWithLogs(db, user_id, project_id, time_zone) {
    return db
      .from('logs')
      .select(
        db.raw(`
          DISTINCT (logs.start_time 
                    AT TIME ZONE ?)::date 
          AS start_day`, time_zone
        ),
        // get the most recent end day, including current day if log is still running
        db.raw(`
          MAX(
               ((CASE WHEN logs.end_time IS NULL THEN (now() AT TIME ZONE 'UTC')
                      ELSE logs.end_time
                 END) 
                 AT TIME ZONE ? 
                 + INTERVAL '1 day'
               )::date
             )
             AS end_day`, time_zone
        )
      )
      .where('logs.project_id', project_id)
      .andWhere('logs.user_id', user_id)
      .groupBy('start_day')
      .orderBy('start_day');
  },
  insertProject(db, user_id, newProject) {
    return db
      .insert(newProject)
      .into('projects')
      .returning('*')
      .then(([project]) =>
        ProjectsService.getById(db, user_id, project.id)
      );
  },
  serializeProject(project) {
    const { owner } = project;
    return {
      id: project.id,
      title: xss(project.title),
      date_created: new Date(project.date_created),
      owner: {
        id: owner.id,
        email: owner.email,
        full_name: owner.full_name,
        nickname: owner.nickname,
        date_created: new Date(owner.date_created),
        date_modified: owner.date_modified ? new Date(owner.date_modified) : null
      }
    };
  },

  /**
   * Get the most recent day of two days.
   */
  mostRecentDay(day1, day2) {
    if (day1 >= day2) return day1;
    return day2;
  },

  /**
   * Merge ranges to so they don't overlap.
   * @param {Array[]} ranges - An array of ranges containing two elements: a start Date and an end Date.
   */
  mergeRanges(ranges) {
    let mergedRanges = [];
    let idx1 = 0;
    let idx2 = 1;

    if (ranges.length === 1) return ranges;

    while (idx2 < ranges.length) {
      // compare end of first log to start of second
      if (ranges[idx1][1] < ranges[idx2][0]) {
        mergedRanges.push(ranges[idx1]);
        idx1 = idx2;
        idx2++;
      } else {
        ranges[idx1][1] =
          this.mostRecentDay(ranges[idx1][1], ranges[idx2][1]);
        idx2++;
      }
      // if the loop is ending, push the last range 
      // or the range merged with last range
      if (idx2 >= ranges.length)
        mergedRanges.push(ranges[idx1]);
    }
    return mergedRanges;
  }
};

module.exports = ProjectsService;
