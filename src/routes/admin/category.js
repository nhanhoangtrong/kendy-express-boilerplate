/* eslint-disable no-undef */
import { Router } from 'express'
import winston from 'winston'

import PostCategory from '../../models/PostCategory'
import Post from '../../models/Post'

export default Router()
/**
 * PostCategory section
 */
.use((req, res, next) => {
    res.locals.section = 'category'
    next()
})
.get('/all', (req, res, next) => {
    const page = parseInt(req.query.page) || 0
    const perPage = parseInt(req.query.per) || 20
    winston.info(`page: ${page} and perPage: ${perPage}`)

    PostCategory
    .find({})
    .skip(page * perPage)
    .limit(perPage)
    .exec()
    .then((postCategories) => {
        res.render('admin/category-list', {
            title: `All Post Categories`,
            postCategories,
        })
    })
    .catch(next)
})
.get('/new', (req, res, next) => {
    res.render('admin/category-edit', {
        title: 'Create a new Post Category',
        postCategory: {},
    })
})
.post('/new', (req, res, next) => {
    PostCategory.create({
        name: req.body.name,
        slug: req.body.slug,
        description: req.body.description,
    })
    .then((postCategory) => {
        req.flash('success', `Category ${postCategory.name} has been created successfully`)
        res.redirect('/admin/category/all')
    })
    .catch((err) => {
        winston.error('%j', err)
        req.flash('error', `${err.message}`)
        // TODO: pass error value into render file
        res.render('admin/category-edit', {
            title: 'Create a new Post Category',
            postCategory: {
                name: req.body.name,
                slug: req.body.slug,
                description: req.body.description,
            }
        })
    })
})
.post('/remove', (req, res, next) => {
    Promise.all([
        PostCategory.findByIdAndRemove(req.body._id).exec(),
        // Remove this PostCategory from posts
        Post.updateMany({}, {
            $pull: {
                categories: req.body._id,
            }
        }).exec(),
    ])
    .then((args) => {
        const removedCategory = args[0]
        const raw = args[1]
        if (removedCategory) {
            res.json({
                status: 'ok',
                code: 200,
                message: `Category '${removedCategory.name}' has been removed successfully!`,
            })
        } else {
            res.json({
                status: 'error',
                code: 404,
                message: 'Category was not found!',
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
.post('/edit', (req, res, next) => {
    PostCategory.findByIdAndUpdate(req.body._id, {
        name: req.body.name,
        slug: req.body.slug,
        description: req.body.description,
    }, {
        runValidators: true,
    })
    .exec()
    .then((postCategory) => {
        if (postCategory) {
            return res.json({
                status: 'ok',
                code: 200,
                message: 'Post Category has been updated successfully',
                data: {
                    postCategory: {
                        name: req.body.name,
                        slug: req.body.slug,
                        description: req.body.description,
                    },
                },
            })
        }
        return res.json({
            status: 'error',
            code: 404,
            message: 'Post Category was not found',
        })
    })
    .catch((err) => {
        winston.error(err)
        res.json({
            status: 'error',
            code: 500,
            message: 'Internal Server Error',
        })
    })
})
.get('/:catId', (req, res, next) => {
    PostCategory.findById(req.params.catId).exec()
    .then((postCategory) => {
        if (postCategory) {
            return res.render('admin/category-edit', {
                title: `Edit "${postCategory.name}" category`,
                postCategory,
            })
        }
        return next()
    })
    .catch(next)
})
.post('/:catId', (req, res, next) => {
    req.body._id = req.params.catId
    PostCategory.findByIdAndUpdate(req.body._id, {
        name: req.body.name,
        slug: req.body.slug,
        description: req.body.description,
    }, {
        runValidators: true,
    })
    .then((postCategory) => {
        req.flash('success', `Category ${postCategory.name} has been updated successfully`)
        res.redirect('/admin/category/all')
    })
    .catch((err) => {
        winston.error('%j', err)
        req.flash('error', `${err.message}`)
        // TODO: pass error value into render file
        res.render('admin/category-edit', {
            title: `Edit "${postCategory.name}" category`,
            postCategory: {
                name: req.body.name,
                slug: req.body.slug,
                description: req.body.description,
            },
        })
    })
})
