
$(function () {
    chrome.storage.local.get('configuration', function (storage) {
        if (_.isEmpty(storage.configuration)) {
            return requireOption();
        }

        var configuration = storage.configuration;



        var processTasks = function (tasks, accountName) {
            var today = moment().format('YYYY-MM-DD');
            var yesterday = moment().subtract(1, 'd').format('YYYY-MM-DD');
            var getYesterdayHtml = function (taskObject) {
                var progress = 0;
                if (parseInt(taskObject.task.consumed) !== 0) {
                    progress = parseFloat(1 - (taskObject.task.left / taskObject.task.consumed)).toFixed(2) * 100;
                }

                return '<tr><td>项目/迭代:' + taskObject.project.name + '<br/>任务：' + taskObject.task.name + '</td><td>' + progress + '% - 100%</td><td>0-8h</td></tr>';
            };

            var getTomorrorHtml = function (taskObject, workTime) {
                var progress = 0;
                if (taskObject.task.status === 'doing') {
                    if (parseInt(taskObject.task.consumed) !== 0) {
                        progress = parseFloat(1 - (taskObject.task.left / taskObject.task.consumed)).toFixed(2) * 100;
                    }

                    var leftTime = parseInt(taskObject.task.left);
                    var time = leftTime > workTime ? ('0-' + workTime) : leftTime;
                    return '<tr><td>项目/迭代：' + taskObject.project.name + '<br/>任务：' + taskObject.task.name + '</td><td>' + progress + '% - 100%</td><td>' + time + 'h</td></tr>';
                }
            };

            var getTodayHtml = function (taskObject) {
                var leftTime = parseInt(taskObject.task.left);
                var progress = taskObject.task.status === 'done' ? 100 : parseFloat(1 - (leftTime / taskObject.task.consumed)).toFixed(2) * 100;
                var totalTime = 0;
                var taskName = taskObject.task.name;
                var todayTime = moment().format('YYYY-MM-DD');
                var isNew = false;

                _.each(taskObject.actions, function (action) {
                    if (moment(action.date).format('YYYY-MM-DD') === todayTime) {
                        switch (action.action) {
                            case 'recordestimate':
                                // 如果记录工时的人不是自己，不计入日志
                                if (action.actor === accountName) {
                                    totalTime += parseInt(action.extra || 0);
                                }
                                break;

                            case 'open':
                                taskName = '[创建]' + taskName;
                                isNew = true;
                                break;
                        }
                    }
                });

                if (!isNew && totalTime === 0) {
                    // 没有工时，并且不是新启动的项目，不记入日志
                    return null;
                } else {
                    return '<tr><td>项目/迭代：' + taskObject.project.name + '<br/>任务：' + taskName + '</td><td>' + progress + '%</td><td>' + totalTime + 'h</td></tr>';
                }
            };

            var processYesterday = function (tasks) {
                return new Promise(function (resolve) {
                    var promises = _.chain(tasks)
                        .filter(function (task) {
                            return task.status === 'doing';
                        })
                        .map(function (task) {
                            return new Promise(function (resolve, reject) {
                                fetchTaskDetail('http://59.46.97.115:8071/zentaopms/www/index.php?m=task&f=view&taskID=' + task.id + '&t=json', function (error, data) {
                                    if (error) {
                                        resolve(null);
                                    } else {
                                        resolve(data);
                                    }
                                });
                            });
                        }).value();

                    Promise.all(promises)
                        .then(function (tasks) {
                            resolve(_.map(tasks, function (task) {
                                return getYesterdayHtml(task);
                            }));
                        });
                });
            };

            var processTomorrow = function (tasks) {
                return new Promise(function (resolve) {
                    var promises = _.chain(tasks)
                        .filter(function (task) {
                            return task.status === 'doing';
                        })
                        .map(function (task) {
                            return new Promise(function (resolve, reject) {
                                fetchTaskDetail('http://59.46.97.115:8071/zentaopms/www/index.php?m=task&f=view&taskID=' + task.id + '&t=json', function (error, data) {
                                    if (error) {
                                        resolve(null);
                                    } else {
                                        resolve(data);
                                    }
                                });
                            });
                        })
                        .value();

                    Promise.all(promises)
                        .then(function (tasks) {
                            var totalTimes = 8;
                            resolve(_.map(tasks, function (t) {
                                var html = getTomorrorHtml(t, totalTimes);
                                totalTimes -= (t.task.left > totalTimes ? totalTimes : t.task.left);

                                return html;
                            }));
                        });
                });
            };

            var processToday = function (tasks) {
                return new Promise(function (resolve) {
                    var promises = _.chain(tasks)
                        .filter(function (task) {
                            return (moment(task.lastEditedDate).format('YYYY-MM-DD') === today);
                        })
                        .map(function (task) {
                            return new Promise(function (resolve, reject) {
                                fetchTaskDetail('http://59.46.97.115:8071/zentaopms/www/index.php?m=task&f=view&taskID=' + task.id + '&t=json', function (error, data) {
                                    if (error) {
                                        resolve(null);
                                    } else {
                                        resolve(data);
                                    }
                                });
                            });
                        }).value();

                    Promise.all(promises)
                        .then(function (tasks) {
                            resolve(_.map(tasks, function (task) {
                                return getTodayHtml(task);
                            }));
                        });
                });
            };



            Promise.all([processYesterday(tasks), processToday(tasks), processTomorrow(tasks)])
                .then(function (htmls) {
                    var allHtml =
                        '<table class="pure-table">' +
                        '<tbody>' +
                        '<tr ><td colspan="3"><strong>本日工作计划</strong></td></tr>' +
                        htmls[0].join('') +
                        '<tr><td colspan="3"><strong>本日实际工作</strong></td></tr>' +
                        htmls[1].join('') +
                        '<tr><td colspan="3"><strong>明日工作计划</strong></td></tr>' +
                        htmls[2].join('') +
                        '</tbody>' +
                        '<tfoot>' +
                        '</tr><td colspan="3" class="copyright"><hr/>chrome.plugin.zentao_working powerd by <a href="mailto:scaperow@hotmail.com">scaperow@hotmail.com</a></td></tr>' +
                        '</tfoot>' +
                        '</table>';

                    $('#content').html(allHtml);
                    $('#run-button').text('Run again');
                });
        };

        $('#run-button').click(function () {
            fetchMine('http://59.46.97.115:8071/zentaopms/www/index.php?m=my&f=profile&t=json', function (error, data) {
                if (error) {
                    alert(error);
                } else {

                    fetchTasks(configuration.serviceUrl, function (error, data) {
                        if (error) {
                            $('#tip').text("Opps,I got some error");
                        } else {
                            $('#tip').text("");

                            processTasks(data.tasks, data.users.account);
                        }
                    });
                }
            });

        });
        $('#openSiteButton').click(function () {
            chrome.tabs.create({
                url: configuration.siteUrl
            });
        });
    });
});





