const express = require('express');
const router = express.Router();
const db = require('../config/database');


router.get('/:userId', async (req, res) => {
    const userId = req.params.userId;
    
    try {
        
        const [
            enrollmentBased,
            completionBased,
            ratingBased,
            popularCourses,
            similarUsersBased
        ] = await Promise.all([
            getEnrollmentBasedRecommendations(userId),
            getCompletionBasedRecommendations(userId),
            getRatingBasedRecommendations(userId),
            getPopularCourses(userId),
            getSimilarUsersRecommendations(userId)
        ]);
        
        
        const recommendations = combineRecommendations({
            enrollmentBased,
            completionBased,
            ratingBased,
            popularCourses,
            similarUsersBased
        });
        
        
        const topRecommendations = recommendations.slice(0, 10);
        const courseIds = topRecommendations.map(r => r.courseId);
        
        if (courseIds.length === 0) {
            return res.json({ 
                success: true, 
                recommendations: [],
                message: 'No recommendations available yet. Start enrolling in courses!' 
            });
        }
        
        const coursesQuery = `
            SELECT 
                c.*,
                COALESCE(AVG(cr.rating), 0) as average_rating,
                COUNT(DISTINCT cr.id) as total_reviews,
                COUNT(DISTINCT e.id) as total_students
            FROM courses c
            LEFT JOIN course_reviews cr ON c.id = cr.course_id
            LEFT JOIN enrollments e ON c.id = e.course_id
            WHERE c.id IN (?)
            GROUP BY c.id
        `;
        
        db.query(coursesQuery, [courseIds], (err, courses) => {
            if (err) {
                console.error('Error fetching courses:', err);
                return res.status(500).json({ success: false, message: 'Error fetching recommendations' });
            }
            
            
            const recommendedCourses = courses.map(course => {
                const rec = topRecommendations.find(r => r.courseId === course.id);
                return {
                    ...course,
                    recommendation_score: rec.score,
                    recommendation_reason: rec.reason
                };
            });
            
            
            recommendedCourses.sort((a, b) => b.recommendation_score - a.recommendation_score);
            
            res.json({ 
                success: true, 
                recommendations: recommendedCourses,
                total: recommendedCourses.length
            });
        });
        
    } catch (error) {
        console.error('Error generating recommendations:', error);
        res.status(500).json({ success: false, message: 'Error generating recommendations' });
    }
});


function getEnrollmentBasedRecommendations(userId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT c.title, c.id
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            WHERE e.user_id = ?
        `;
        
        db.query(query, [userId], (err, enrolledCourses) => {
            if (err) return reject(err);
            
            const recommendations = [];
            const courseMap = {
                
                'Full Stack Web Development': ['Python for Data Science', 'Mobile App Development'],
                'Python for Data Science': ['AI & Machine Learning', 'Full Stack Web Development'],
                'AI & Machine Learning': ['Python for Data Science', 'Full Stack Web Development'],
                'Mobile App Development': ['Full Stack Web Development', 'AI & Machine Learning']
            };
            
            enrolledCourses.forEach(course => {
                const related = courseMap[course.title] || [];
                related.forEach(relatedTitle => {
                    recommendations.push({
                        title: relatedTitle,
                        score: 3,
                        reason: `Because you're learning ${course.title}`
                    });
                });
            });
            
            resolve(recommendations);
        });
    });
}


function getCompletionBasedRecommendations(userId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT c.title, c.id, e.progress_percentage
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            WHERE e.user_id = ? AND e.progress_percentage >= 80
        `;
        
        db.query(query, [userId], (err, completedCourses) => {
            if (err) return reject(err);
            
            const recommendations = [];
            const advancedMap = {
                'Full Stack Web Development': ['AI & Machine Learning', 'Mobile App Development'],
                'Python for Data Science': ['AI & Machine Learning'],
                'AI & Machine Learning': ['Python for Data Science'],
                'Mobile App Development': ['Full Stack Web Development']
            };
            
            completedCourses.forEach(course => {
                const advanced = advancedMap[course.title] || [];
                advanced.forEach(advTitle => {
                    recommendations.push({
                        title: advTitle,
                        score: 5,
                        reason: `Next step after completing ${course.title}`
                    });
                });
            });
            
            resolve(recommendations);
        });
    });
}


function getRatingBasedRecommendations(userId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT c.title, c.difficulty_level, cr.rating
            FROM course_reviews cr
            JOIN courses c ON cr.course_id = c.id
            WHERE cr.user_id = ? AND cr.rating >= 4
        `;
        
        db.query(query, [userId], (err, ratedCourses) => {
            if (err) return reject(err);
            
            if (ratedCourses.length === 0) {
                return resolve([]);
            }
            
            
            const difficulties = [...new Set(ratedCourses.map(c => c.difficulty_level))];
            
            const recommendQuery = `
                SELECT c.id, c.title, c.difficulty_level,
                       COALESCE(AVG(cr.rating), 0) as avg_rating
                FROM courses c
                LEFT JOIN course_reviews cr ON c.id = cr.course_id
                WHERE c.difficulty_level IN (?)
                AND c.id NOT IN (
                    SELECT course_id FROM enrollments WHERE user_id = ?
                )
                GROUP BY c.id
                HAVING avg_rating >= 4
                ORDER BY avg_rating DESC
                LIMIT 5
            `;
            
            db.query(recommendQuery, [difficulties, userId], (err, results) => {
                if (err) return reject(err);
                
                const recommendations = results.map(course => ({
                    title: course.title,
                    courseId: course.id,
                    score: 4,
                    reason: `Highly rated ${course.difficulty_level} course (${parseFloat(course.avg_rating).toFixed(1)}⭐)`
                }));
                
                resolve(recommendations);
            });
        });
    });
}


function getPopularCourses(userId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT c.id, c.title,
                   COUNT(DISTINCT e.id) as enrollment_count,
                   COALESCE(AVG(cr.rating), 0) as avg_rating
            FROM courses c
            LEFT JOIN enrollments e ON c.id = e.course_id
            LEFT JOIN course_reviews cr ON c.id = cr.course_id
            WHERE c.id NOT IN (
                SELECT course_id FROM enrollments WHERE user_id = ?
            )
            GROUP BY c.id
            ORDER BY enrollment_count DESC, avg_rating DESC
            LIMIT 5
        `;
        
        db.query(query, [userId], (err, results) => {
            if (err) return reject(err);
            
            const recommendations = results.map(course => ({
                title: course.title,
                courseId: course.id,
                score: 2,
                reason: `Popular choice (${course.enrollment_count} students enrolled)`
            }));
            
            resolve(recommendations);
        });
    });
}


function getSimilarUsersRecommendations(userId) {
    return new Promise((resolve, reject) => {
        
        const query = `
            SELECT e2.course_id, c.title, COUNT(DISTINCT e2.user_id) as similar_users
            FROM enrollments e1
            JOIN enrollments e2 ON e1.course_id = e2.course_id
            JOIN courses c ON e2.course_id = c.id
            WHERE e1.user_id = ? 
            AND e2.user_id != ?
            AND e2.course_id NOT IN (
                SELECT course_id FROM enrollments WHERE user_id = ?
            )
            GROUP BY e2.course_id, c.title
            HAVING COUNT(DISTINCT e2.user_id) >= 2
            ORDER BY COUNT(DISTINCT e2.user_id) DESC
            LIMIT 5
        `;
        
        db.query(query, [userId, userId, userId], (err, results) => {
            if (err) return reject(err);
            
            const recommendations = results.map(course => ({
                title: course.title,
                courseId: course.course_id,
                score: 4,
                reason: 'Students with similar interests also enrolled in this'
            }));
            
            resolve(recommendations);
        });
    });
}


function combineRecommendations(strategies) {
    const scoreMap = new Map();
    
    
    Object.values(strategies).forEach(recommendations => {
        recommendations.forEach(rec => {
            const key = rec.courseId || rec.title;
            
            if (scoreMap.has(key)) {
                const existing = scoreMap.get(key);
                existing.score += rec.score;
                existing.reasons.push(rec.reason);
            } else {
                scoreMap.set(key, {
                    courseId: rec.courseId,
                    title: rec.title,
                    score: rec.score,
                    reasons: [rec.reason]
                });
            }
        });
    });
    
    
    const recommendations = Array.from(scoreMap.values()).map(rec => ({
        courseId: rec.courseId,
        title: rec.title,
        score: rec.score,
        reason: rec.reasons[0] 
    }));
    
    
    recommendations.sort((a, b) => b.score - a.score);
    
    return recommendations;
}


router.get('/:userId/explain/:courseId', (req, res) => {
    const { userId, courseId } = req.params;
    
    const query = `
        SELECT 
            c.title,
            c.difficulty_level,
            (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as total_students,
            COALESCE(AVG(cr.rating), 0) as avg_rating,
            (SELECT COUNT(*) FROM enrollments e2 
             WHERE e2.course_id = c.id 
             AND e2.user_id IN (
                 SELECT DISTINCT e1.user_id 
                 FROM enrollments e1 
                 WHERE e1.course_id IN (
                     SELECT course_id FROM enrollments WHERE user_id = ?
                 )
             )) as similar_users_enrolled
        FROM courses c
        LEFT JOIN course_reviews cr ON c.id = cr.course_id
        WHERE c.id = ?
        GROUP BY c.id
    `;
    
    db.query(query, [userId, courseId], (err, results) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ success: false, message: 'Error fetching explanation' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }
        
        const course = results[0];
        const reasons = [];
        
        if (course.avg_rating >= 4) {
            reasons.push(`Highly rated course (${course.avg_rating.toFixed(1)}⭐)`);
        }
        
        if (course.total_students > 100) {
            reasons.push(`Popular with ${course.total_students} students`);
        }
        
        if (course.similar_users_enrolled > 0) {
            reasons.push(`${course.similar_users_enrolled} students with similar interests enrolled`);
        }
        
        res.json({
            success: true,
            course: course.title,
            reasons: reasons.length > 0 ? reasons : ['Recommended based on your profile']
        });
    });
});

module.exports = router;
