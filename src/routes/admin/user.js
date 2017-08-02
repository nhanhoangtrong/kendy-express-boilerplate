/* eslint-disable no-undef */
import { Router } from 'express'

import Post from '../../models/Post'
import User from '../../models/User'

export default Router()
/**
 * User section
 */
.use((req, res, next) => {
    res.locals.section = 'users'
    next()
})
.get('/all', (req, res, next) => {
    const page = req.params.page || 0
    const perPage = req.params.per || 20
    User.find({})
    .skip(page * perPage)
    .limit(perPage)
    .exec()
    .then((users) => {
        res.render('admin/user-list', {
            title: 'All Users',
            users: users,
        })
    })
    .catch((err) => {
        console.error(err)
        res.render('admin/error', {
            title: 'Error',
            error: 'Error 500',
            message: err.message,
        })
    })
})
.get('/new', (req, res, next) => {
    res.render('admin/user-edit', {
        title: `Creating a new user`,
        section: 'users',
        edittedUser: {
            createdAt: Date.now(),
        },
    })
})
.post('/new', (req, res, next) => {
    if (req.body.password === req.body.repassword) {
        req.body.createdAt = new Date(req.body.createdAt).getTime()

        User.create({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            password: req.body.password,
            isAdmin: req.body.isAdmin,
        })
        .then((user) => {
            req.flash('success', `User ${user.firstName} has been created successfully`)
            res.redirect('/admin/user/all')
        })
        .catch((err) => {
            console.log(err)
            req.flash('error', err.message)
            res.render('admin/user-edit', {
                title: `Creating a new user`,
                edittedUser: {
                    firstName: req.body.firstName,
                    lastName: req.body.lastName,
                    email: req.body.email,
                    createdAt: req.body.createdAt,
                    isAdmin: req.body.isAdmin,
                },
            })
        })
    } else {
        req.flash('error', 'Re-type password does not match.')
        res.render('admin/user-edit', {
            title: `Creating a new user`,
            edittedUser: {
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                email: req.body.email,
                createdAt: req.body.createdAt,
                isAdmin: req.body.isAdmin,
            },
        })
    }
})
.post('/remove', (req, res, next) => {
    const userId = req.body._id

    Promise.all([
        User.findByIdAndRemove(userId).exec(),
        Post.deleteMany({
            author: userId,
        }).exec(),
    ])
    .then(([removedUser, removedPosts]) => {
        if (removedUser) {
            res.json({
                status: 'ok',
                code: 200,
                message: `User '${removedUser.firstName} ${removedUser.lastName}' has been removed successfully!`,
            })
        } else {
            res.json({
                status: 'error',
                code: 404,
                message: 'User was not found!',
            })
        }
    })
    .catch((err) => {
        res.json({
            status: 'error',
            code: 500,
            message: err.message,
        })
    })
})
.get('/:userId', (req, res, next) => {
    User.findById(req.params.userId)
    .exec()
    .then((user) => {
        if (user) {
            return res.render('admin/user-edit', {
                title: `Editing user ${user.firstName} ${user.lastName}`,
                edittedUser: user,
            })
        }
        throw new Error('User not found')
    })
    .catch((err) => {
        console.error(err)
        res.render('admin/error', {
            title: 'Error',
            error: 'Error 500',
            message: err.message,
        })
    })
})
.post('/:userId', (req, res, next) => {
    req.body.createdAt = new Date(req.body.createdAt).getTime()
    User.findByIdAndUpdate(req.params.userId, {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        password: req.body.password,
        isAdmin: req.body.isAdmin,
    })
    .exec()
    .then(() => {
        req.flash('success', `User ${req.body.name} has been updated successfully`)
        res.redirect('/admin/user/all')
    })
    .catch((err) => {
        console.error(err)
        req.flash('error', err.message)
        res.render('admin/user-edit', {
            title: `Creating a new user`,
            edittedUser: {
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                email: req.body.email,
                createdAt: req.body.createdAt,
                isAdmin: req.body.isAdmin,
            },
        })
    })
})
