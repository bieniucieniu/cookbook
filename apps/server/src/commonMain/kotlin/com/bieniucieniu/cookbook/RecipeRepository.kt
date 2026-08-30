package com.bieniucieniu.cookbook

import io.github.smyrgeorge.sqlx4k.CrudRepository
import io.github.smyrgeorge.sqlx4k.QueryExecutor
import io.github.smyrgeorge.sqlx4k.annotation.Query
import io.github.smyrgeorge.sqlx4k.annotation.Repository

@Repository
interface RecipeRepository : CrudRepository<Recipe> {
    @Query("SELECT * FROM recipes")
    suspend fun findAll(context: QueryExecutor): Result<List<Recipe>>
}
